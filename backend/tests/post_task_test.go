package tests

import (
	"bytes"
	"context"
	"encoding/json"

	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"ufpeerassist/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// PostTaskTest encapsulates all test dependencies
type PostTaskTest struct {
	client    *mongo.Client
	db        *mongo.Database
	router    *gin.Engine
	taskID    string
	validID   primitive.ObjectID
	ctx       context.Context
	cancelCtx context.CancelFunc
}

// Initialize sets up the test environment
func (pt *PostTaskTest) Initialize(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a context with timeout
	pt.ctx, pt.cancelCtx = context.WithTimeout(context.Background(), 30*time.Second)

	// Connect to MongoDB
	var err error
	pt.client, err = mongo.Connect(pt.ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Use a test database with a unique name to avoid conflicts
	pt.db = pt.client.Database("ufpeerassist_test_post_task")

	// Clear existing data from collections
	pt.db.Collection("users").DeleteMany(pt.ctx, bson.M{})
	pt.db.Collection("tasks").DeleteMany(pt.ctx, bson.M{})

	// Seed test data
	pt.seedTestData(t)

	// Initialize router with mock handler
	pt.router = gin.Default()
	pt.router.POST("/tasks/:email", pt.mockPostATask)
	pt.router.PUT("/tasks/:email", pt.mockPostATask)
}

// Cleanup tears down the test environment
func (pt *PostTaskTest) Cleanup(t *testing.T) {
	// Drop the test database
	err := pt.db.Drop(pt.ctx)
	if err != nil {
		t.Logf("Warning: Failed to drop test database: %v", err)
	}

	// Disconnect from MongoDB
	err = pt.client.Disconnect(pt.ctx)
	if err != nil {
		t.Logf("Warning: Failed to disconnect from MongoDB: %v", err)
	}

	// Cancel the context
	pt.cancelCtx()
}

// Mock PostATask handler
func (pt *PostTaskTest) mockPostATask(c *gin.Context) {
	// Get email from URL parameter
	email := c.Param("email")

	// Check if user exists
	var user models.Users
	err := pt.db.Collection("users").FindOne(pt.ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Define the input structure
	var input struct {
		ID               string  `json:"id"`
		Title            string  `json:"title" binding:"required"`
		Description      string  `json:"description" binding:"required"`
		TaskTime         string  `json:"task_time" binding:"required"`
		TaskDate         string  `json:"task_date" binding:"required"` // Format: YYYY-MM-DD
		EstimatedPayRate float64 `json:"estimated_pay_rate" binding:"required"`
		PlaceOfWork      string  `json:"place_of_work" binding:"required"`
		WorkType         string  `json:"work_type" binding:"required"`
		PeopleNeeded     int     `json:"people_needed" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse the task date
	taskDate, err := time.Parse("2006-01-02", input.TaskDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}

	// Check if work type is valid
	validWorkType := false
	for _, category := range []models.TaskCategory{
		models.Plumbing,
		models.HouseShifting,
		models.Carpentry,
		models.Cleaning,
		models.Electrical,
		models.Painting,
		models.Gardening,
		models.Tutoring,
		models.ComputerHelp,
		models.Other,
	} {
		if string(category) == input.WorkType {
			validWorkType = true
			break
		}
	}

	if !validWorkType {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid work type",
			"valid_types": []string{
				string(models.Plumbing),
				string(models.HouseShifting),
				string(models.Carpentry),
				string(models.Cleaning),
				string(models.Electrical),
				string(models.Painting),
				string(models.Gardening),
				string(models.Tutoring),
				string(models.ComputerHelp),
				string(models.Other),
			},
		})
		return
	}

	now := time.Now()

	// Check if we're updating an existing task or creating a new one
	if input.ID != "" {
		// Convert string ID to ObjectID
		objectID, err := primitive.ObjectIDFromHex(input.ID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID format"})
			return
		}

		// Find the existing task
		var existingTask models.Task
		err = pt.db.Collection("tasks").FindOne(
			pt.ctx,
			bson.M{
				"_id":           objectID,
				"creator_email": email,
			},
		).Decode(&existingTask)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Task not found or you don't have permission to update it"})
			return
		}

		// Update the task
		update := bson.M{
			"$set": bson.M{
				"title":              input.Title,
				"description":        input.Description,
				"task_time":          input.TaskTime,
				"task_date":          taskDate,
				"estimated_pay_rate": input.EstimatedPayRate,
				"place_of_work":      input.PlaceOfWork,
				"work_type":          models.TaskCategory(input.WorkType),
				"people_needed":      input.PeopleNeeded,
				"updated_at":         now,
			},
		}

		result, err := pt.db.Collection("tasks").UpdateOne(
			pt.ctx,
			bson.M{"_id": objectID},
			update,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task", "details": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Task updated successfully",
			"updated": result.ModifiedCount > 0,
			"task_id": input.ID,
		})

	} else {
		// Create a new task
		newTask := models.Task{
			ID:               primitive.NewObjectID(),
			Title:            input.Title,
			Description:      input.Description,
			TaskTime:         input.TaskTime,
			TaskDate:         taskDate,
			EstimatedPayRate: input.EstimatedPayRate,
			PlaceOfWork:      input.PlaceOfWork,
			WorkType:         models.TaskCategory(input.WorkType),
			PeopleNeeded:     input.PeopleNeeded,

			// Meta data
			CreatorEmail:  email,
			CreatedAt:     now,
			UpdatedAt:     now,
			Status:        models.Open,
			Views:         0,
			Applicants:    []string{},
			SelectedUsers: []string{},
		}

		// Insert the task
		result, err := pt.db.Collection("tasks").InsertOne(pt.ctx, newTask)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task", "details": err.Error()})
			return
		}

		// Convert the InsertedID to a string
		insertedID := result.InsertedID.(primitive.ObjectID).Hex()

		c.JSON(http.StatusCreated, gin.H{
			"message": "Task created successfully",
			"task_id": insertedID,
		})
	}
}

// Seed the test database with initial data
func (pt *PostTaskTest) seedTestData(t *testing.T) {
	// Insert test users
	_, err := pt.db.Collection("users").InsertOne(pt.ctx, models.Users{
		Name:   "TaskCreator",
		Email:  "taskcreator@example.com",
		Mobile: "1234567890",
	})
	if err != nil {
		t.Fatalf("Failed to seed test users: %v", err)
	}

	// Create a test task
	pt.validID = primitive.NewObjectID()
	pt.taskID = pt.validID.Hex()

	now := time.Now()
	taskDate, _ := time.Parse("2006-01-02", "2025-04-15")

	_, err = pt.db.Collection("tasks").InsertOne(pt.ctx, models.Task{
		ID:               pt.validID,
		Title:            "Existing Test Task",
		Description:      "This is a test task for updating",
		TaskTime:         "14:00",
		TaskDate:         taskDate,
		EstimatedPayRate: 20.0,
		PlaceOfWork:      "Campus",
		WorkType:         models.Cleaning,
		PeopleNeeded:     2,
		CreatorEmail:     "taskcreator@example.com",
		CreatedAt:        now,
		UpdatedAt:        now,
		Status:           models.Open,
		Views:            0,
		Applicants:       []string{},
		SelectedUsers:    []string{},
	})
	if err != nil {
		t.Fatalf("Failed to seed test task: %v", err)
	}
}

// Test creating a new task
func TestCreateTaskSuccess(t *testing.T) {
	// Initialize test environment
	pt := &PostTaskTest{}
	pt.Initialize(t)
	defer pt.Cleanup(t)

	// Create test request with new task data
	taskData := map[string]interface{}{
		"title":              "New Test Task",
		"description":        "This is a newly created test task",
		"task_time":          "15:30",
		"task_date":          "2025-04-20",
		"estimated_pay_rate": 25.5,
		"place_of_work":      "Library",
		"work_type":          "Tutoring",
		"people_needed":      1,
	}

	jsonData, _ := json.Marshal(taskData)
	req, _ := http.NewRequest("POST", "/tasks/taskcreator@example.com", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()

	// Serve the request
	pt.router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusCreated, w.Code, "Expected status 201 Created, got %d with body: %s", w.Code, w.Body.String())

	// Parse the response
	var response struct {
		Message string `json:"message"`
		TaskID  string `json:"task_id"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)

	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Task created successfully", response.Message,
		"Expected success message but got: %s", response.Message)
	assert.NotEmpty(t, response.TaskID, "Task ID should not be empty")

	// Check that the task was actually created in the database
	var task models.Task
	objectID, _ := primitive.ObjectIDFromHex(response.TaskID)
	err = pt.db.Collection("tasks").FindOne(pt.ctx, bson.M{"_id": objectID}).Decode(&task)
	assert.NoError(t, err, "Task should exist in the database")
	assert.Equal(t, "New Test Task", task.Title)
	assert.Equal(t, "taskcreator@example.com", task.CreatorEmail)
}

// Test updating an existing task
func TestUpdateTaskSuccess(t *testing.T) {
	// Initialize test environment
	pt := &PostTaskTest{}
	pt.Initialize(t)
	defer pt.Cleanup(t)

	// Create update task data with the existing task ID
	taskData := map[string]interface{}{
		"id":                 pt.taskID,
		"title":              "Updated Test Task",
		"description":        "This task has been updated",
		"task_time":          "16:45",
		"task_date":          "2025-04-25",
		"estimated_pay_rate": 30.0,
		"place_of_work":      "Student Center",
		"work_type":          "Carpentry",
		"people_needed":      3,
	}

	jsonData, _ := json.Marshal(taskData)
	req, _ := http.NewRequest("PUT", "/tasks/taskcreator@example.com", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()

	// Serve the request
	pt.router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK, got %d with body: %s", w.Code, w.Body.String())

	// Parse the response
	var response struct {
		Message string `json:"message"`
		Updated bool   `json:"updated"`
		TaskID  string `json:"task_id"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)

	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Task updated successfully", response.Message)
	assert.True(t, response.Updated, "Task should be marked as updated")
	assert.Equal(t, pt.taskID, response.TaskID, "Task ID should match")

	// Check that the task was actually updated in the database
	var task models.Task
	err = pt.db.Collection("tasks").FindOne(pt.ctx, bson.M{"_id": pt.validID}).Decode(&task)
	assert.NoError(t, err, "Task should exist in the database")
	assert.Equal(t, "Updated Test Task", task.Title)
	assert.Equal(t, "This task has been updated", task.Description)
	assert.Equal(t, models.Carpentry, task.WorkType)
}

// Test creating a task with invalid work type
func TestCreateTaskInvalidWorkType(t *testing.T) {
	// Initialize test environment
	pt := &PostTaskTest{}
	pt.Initialize(t)
	defer pt.Cleanup(t)

	taskData := map[string]interface{}{
		"title":              "Invalid Work Type Task",
		"description":        "This task has an invalid work type",
		"task_time":          "10:00",
		"task_date":          "2025-04-22",
		"estimated_pay_rate": 25.0,
		"place_of_work":      "Campus",
		"work_type":          "InvalidCategory", // Not a valid category
		"people_needed":      2,
	}

	jsonData, _ := json.Marshal(taskData)
	req, _ := http.NewRequest("POST", "/tasks/taskcreator@example.com", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	pt.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code, "Expected status 400 Bad Request for invalid work type")

	var response map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Invalid work type", response["error"])
	assert.NotNil(t, response["valid_types"], "Response should include valid types")
}

// Test updating a task with invalid task ID
func TestUpdateTaskInvalidID(t *testing.T) {
	// Initialize test environment
	pt := &PostTaskTest{}
	pt.Initialize(t)
	defer pt.Cleanup(t)

	taskData := map[string]interface{}{
		"id":                 "invalid-id-format",
		"title":              "Task with Invalid ID",
		"description":        "This task has an invalid ID format",
		"task_time":          "11:00",
		"task_date":          "2025-04-23",
		"estimated_pay_rate": 22.0,
		"place_of_work":      "Remote",
		"work_type":          "Tutoring",
		"people_needed":      1,
	}

	jsonData, _ := json.Marshal(taskData)
	req, _ := http.NewRequest("PUT", "/tasks/taskcreator@example.com", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	pt.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code, "Expected status 400 Bad Request for invalid task ID")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Invalid task ID format", response.Error)
}

// Test updating a task that doesn't belong to the user
func TestUpdateTaskUnauthorized(t *testing.T) {
	// Initialize test environment
	pt := &PostTaskTest{}
	pt.Initialize(t)
	defer pt.Cleanup(t)

	// First create a different user
	_, err := pt.db.Collection("users").InsertOne(pt.ctx, models.Users{
		Name:   "Another User",
		Email:  "another@example.com",
		Mobile: "9876543210",
	})
	assert.NoError(t, err)

	taskData := map[string]interface{}{
		"id":                 pt.taskID, // Trying to update a task created by taskcreator@example.com
		"title":              "Unauthorized Update Attempt",
		"description":        "This is an attempt to update someone else's task",
		"task_time":          "12:00",
		"task_date":          "2025-04-24",
		"estimated_pay_rate": 28.0,
		"place_of_work":      "Campus",
		"work_type":          "Cleaning",
		"people_needed":      2,
	}

	jsonData, _ := json.Marshal(taskData)
	req, _ := http.NewRequest("PUT", "/tasks/another@example.com", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	pt.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusNotFound, w.Code, "Expected status 404 Not Found when updating another user's task")

	var response struct {
		Error string `json:"error"`
	}
	err = json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Task not found or you don't have permission to update it", response.Error)
}

//-----------

// Test creating a task for a non-existent user
func TestCreateTaskUserDoesNotExist(t *testing.T) {
	pt := &PostTaskTest{}
	pt.Initialize(t)
	defer pt.Cleanup(t)

	taskData := map[string]interface{}{
		"title":              "Ghost User Task",
		"description":        "Trying to post with non-existent user",
		"task_time":          "09:00",
		"task_date":          "2025-04-30",
		"estimated_pay_rate": 18.0,
		"place_of_work":      "Dorm",
		"work_type":          "Plumbing",
		"people_needed":      1,
	}

	jsonData, _ := json.Marshal(taskData)
	req, _ := http.NewRequest("POST", "/tasks/notarealuser@example.com", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	pt.router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var response map[string]string
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	assert.Equal(t, "User not found", response["error"])
}

// Test creating a task with invalid input data (missing required fields)
func TestCreateTaskInvalidInput(t *testing.T) {
	pt := &PostTaskTest{}
	pt.Initialize(t)
	defer pt.Cleanup(t)

	// Missing required field "description"
	taskData := map[string]interface{}{
		"title":              "Incomplete Task",
		"task_time":          "13:00",
		"task_date":          "2025-05-01",
		"estimated_pay_rate": 15.0,
		"place_of_work":      "Cafeteria",
		"work_type":          "Tutoring",
		"people_needed":      1,
	}

	jsonData, _ := json.Marshal(taskData)
	req, _ := http.NewRequest("POST", "/tasks/taskcreator@example.com", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	pt.router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]string
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	assert.Contains(t, response["error"], "Description")
}
