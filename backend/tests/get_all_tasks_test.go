package tests

import (
	"context"
	"encoding/json"
	"log"
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

// GetAllTasksTest encapsulates all test dependencies
type GetAllTasksTest struct {
	client    *mongo.Client
	db        *mongo.Database
	router    *gin.Engine
	taskIDs   []primitive.ObjectID
	ctx       context.Context
	cancelCtx context.CancelFunc
}

// Initialize sets up the test environment
func (gt *GetAllTasksTest) Initialize(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a context with timeout
	gt.ctx, gt.cancelCtx = context.WithTimeout(context.Background(), 30*time.Second)

	// Connect to MongoDB
	var err error
	gt.client, err = mongo.Connect(gt.ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Use a test database with a unique name to avoid conflicts
	gt.db = gt.client.Database("ufpeerassist_test_get_all_tasks")

	// Clear existing data from collections
	gt.db.Collection("users").DeleteMany(gt.ctx, bson.M{})
	gt.db.Collection("tasks").DeleteMany(gt.ctx, bson.M{})

	// Seed test data
	gt.seedTestData(t)

	// Initialize router with mock handler
	gt.router = gin.Default()
	gt.router.GET("/tasks/available/:viewer_email", gt.mockGetAllTasksForUser)
}

// Cleanup tears down the test environment
func (gt *GetAllTasksTest) Cleanup(t *testing.T) {
	// Drop the test database
	err := gt.db.Drop(gt.ctx)
	if err != nil {
		t.Logf("Warning: Failed to drop test database: %v", err)
	}

	// Disconnect from MongoDB
	err = gt.client.Disconnect(gt.ctx)
	if err != nil {
		t.Logf("Warning: Failed to disconnect from MongoDB: %v", err)
	}

	// Cancel the context
	gt.cancelCtx()
}

// Mock GetAllTasksForUser handler
func (gt *GetAllTasksTest) mockGetAllTasksForUser(c *gin.Context) {
	// Get viewer's email from URL parameter
	viewerEmail := c.Param("viewer_email")

	// Verify that viewer exists (authentication check)
	var viewer models.Users
	err := gt.db.Collection("users").FindOne(gt.ctx, bson.M{"email": viewerEmail}).Decode(&viewer)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required. User not found."})
		return
	}

	// Build filter options
	filter := bson.M{
		"status": models.Open, // Only return open tasks by default
	}

	// Don't show user's own tasks in the feed
	filter["creator_email"] = bson.M{"$ne": viewerEmail}

	// Don't show tasks that the user has already applied for
	filter["applicants"] = bson.M{"$nin": []string{viewerEmail}}

	// Filter by category if provided
	if category := c.Query("category"); category != "" {
		filter["work_type"] = category
	}

	// Filter by date range if provided
	if fromDate := c.Query("from_date"); fromDate != "" {
		parsedFromDate, err := time.Parse("2006-01-02", fromDate)
		if err == nil {
			if filter["task_date"] == nil {
				filter["task_date"] = bson.M{}
			}
			filter["task_date"].(bson.M)["$gte"] = parsedFromDate
		}
	}

	if toDate := c.Query("to_date"); toDate != "" {
		parsedToDate, err := time.Parse("2006-01-02", toDate)
		if err == nil {
			if filter["task_date"] == nil {
				filter["task_date"] = bson.M{}
			}
			filter["task_date"].(bson.M)["$lte"] = parsedToDate
		}
	}

	// Define options for sorting - oldest first
	findOptions := options.Find().
		SetSort(bson.M{"created_at": 1}) // Sort by oldest first (ascending order)

	// Execute the query
	cursor, err := gt.db.Collection("tasks").Find(gt.ctx, filter, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve tasks", "details": err.Error()})
		return
	}
	defer cursor.Close(gt.ctx)

	// Decode results
	var tasks []models.Task
	if err := cursor.All(gt.ctx, &tasks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode tasks", "details": err.Error()})
		return
	}

	// Ensure tasks is never null, use empty array instead
	if tasks == nil {
		tasks = []models.Task{}
	}

	// Increment view count for each task (in a real implementation, this would be in a goroutine)
	for _, task := range tasks {
		_, err := gt.db.Collection("tasks").UpdateOne(
			gt.ctx,
			bson.M{"_id": task.ID},
			bson.M{"$inc": bson.M{"views": 1}},
		)
		if err != nil {
			log.Printf("Error incrementing view count for task %s: %v\n", task.ID, err)
		}
	}

	// Return all tasks without pagination
	c.JSON(http.StatusOK, gin.H{
		"tasks": tasks,
		"count": len(tasks),
	})
}

// Seed the test database with initial data
func (gt *GetAllTasksTest) seedTestData(t *testing.T) {
	// Insert test users
	_, err := gt.db.Collection("users").InsertMany(gt.ctx, []interface{}{
		models.Users{
			Name:   "Viewer User",
			Email:  "viewer@example.com",
			Mobile: "1234567890",
		},
		models.Users{
			Name:   "Creator User",
			Email:  "creator@example.com",
			Mobile: "9876543210",
		},
		models.Users{
			Name:   "Another Creator",
			Email:  "another@example.com",
			Mobile: "5551234567",
		},
		models.Users{
			Name:   "Applicant User",
			Email:  "applicant@example.com",
			Mobile: "8885551234",
		},
		models.Users{
			Name:   "Non-Existent User",
			Email:  "nonexistent@example.com",
			Mobile: "1112223333",
		},
	})
	if err != nil {
		t.Fatalf("Failed to seed test users: %v", err)
	}

	// Create some test tasks with different creators, dates, and categories
	now := time.Now()
	gt.taskIDs = make([]primitive.ObjectID, 7)

	// Task dates
	date1, _ := time.Parse("2006-01-02", "2025-04-10")
	date2, _ := time.Parse("2006-01-02", "2025-04-15")
	date3, _ := time.Parse("2006-01-02", "2025-04-20")
	date4, _ := time.Parse("2006-01-02", "2025-04-25")
	date5, _ := time.Parse("2006-01-02", "2025-04-30")
	date6, _ := time.Parse("2006-01-02", "2025-05-05")
	date7, _ := time.Parse("2006-01-02", "2025-05-10")

	// Create tasks with different attributes
	tasks := []interface{}{
		models.Task{
			ID:               primitive.NewObjectID(),
			Title:            "Plumbing Task",
			Description:      "Fix a leaky faucet",
			TaskTime:         "10:00",
			TaskDate:         date1,
			EstimatedPayRate: 25.50,
			PlaceOfWork:      "Apartment",
			WorkType:         models.Plumbing,
			PeopleNeeded:     1,
			CreatorEmail:     "creator@example.com",
			CreatedAt:        now.Add(-48 * time.Hour),
			UpdatedAt:        now.Add(-48 * time.Hour),
			Status:           models.Open,
			Views:            5,
			Applicants:       []string{},
			SelectedUsers:    []string{},
		},
		models.Task{
			ID:               primitive.NewObjectID(),
			Title:            "Cleaning Task",
			Description:      "Clean the house",
			TaskTime:         "14:00",
			TaskDate:         date2,
			EstimatedPayRate: 20.00,
			PlaceOfWork:      "House",
			WorkType:         models.Cleaning,
			PeopleNeeded:     2,
			CreatorEmail:     "another@example.com",
			CreatedAt:        now.Add(-36 * time.Hour),
			UpdatedAt:        now.Add(-36 * time.Hour),
			Status:           models.Open,
			Views:            3,
			Applicants:       []string{},
			SelectedUsers:    []string{},
		},
		models.Task{
			ID:               primitive.NewObjectID(),
			Title:            "Tutoring Task",
			Description:      "Help with math homework",
			TaskTime:         "16:00",
			TaskDate:         date3,
			EstimatedPayRate: 30.00,
			PlaceOfWork:      "Library",
			WorkType:         models.Tutoring,
			PeopleNeeded:     1,
			CreatorEmail:     "creator@example.com",
			CreatedAt:        now.Add(-24 * time.Hour),
			UpdatedAt:        now.Add(-24 * time.Hour),
			Status:           models.Open,
			Views:            8,
			Applicants:       []string{"viewer@example.com"}, // Viewer has applied for this task
			SelectedUsers:    []string{},
		},
		models.Task{
			ID:               primitive.NewObjectID(),
			Title:            "Painting Task",
			Description:      "Paint a room",
			TaskTime:         "09:00",
			TaskDate:         date4,
			EstimatedPayRate: 35.00,
			PlaceOfWork:      "House",
			WorkType:         models.Painting,
			PeopleNeeded:     2,
			CreatorEmail:     "another@example.com",
			CreatedAt:        now.Add(-12 * time.Hour),
			UpdatedAt:        now.Add(-12 * time.Hour),
			Status:           models.Open,
			Views:            2,
			Applicants:       []string{},
			SelectedUsers:    []string{},
		},
		models.Task{
			ID:               primitive.NewObjectID(),
			Title:            "Gardening Task",
			Description:      "Mow the lawn and trim hedges",
			TaskTime:         "08:00",
			TaskDate:         date5,
			EstimatedPayRate: 25.00,
			PlaceOfWork:      "House",
			WorkType:         models.Gardening,
			PeopleNeeded:     1,
			CreatorEmail:     "viewer@example.com", // Created by the viewer
			CreatedAt:        now.Add(-6 * time.Hour),
			UpdatedAt:        now.Add(-6 * time.Hour),
			Status:           models.Open,
			Views:            0,
			Applicants:       []string{},
			SelectedUsers:    []string{},
		},
		models.Task{
			ID:               primitive.NewObjectID(),
			Title:            "Closed Task",
			Description:      "This task is already closed",
			TaskTime:         "13:00",
			TaskDate:         date6,
			EstimatedPayRate: 40.00,
			PlaceOfWork:      "Office",
			WorkType:         models.ComputerHelp,
			PeopleNeeded:     1,
			CreatorEmail:     "creator@example.com",
			CreatedAt:        now.Add(-3 * time.Hour),
			UpdatedAt:        now.Add(-1 * time.Hour),
			Status:           models.Completed, // Task is completed, not open
			Views:            7,
			Applicants:       []string{},
			SelectedUsers:    []string{},
		},
		models.Task{
			ID:               primitive.NewObjectID(),
			Title:            "Electrical Task",
			Description:      "Fix wiring in the kitchen",
			TaskTime:         "11:00",
			TaskDate:         date7,
			EstimatedPayRate: 45.00,
			PlaceOfWork:      "House",
			WorkType:         models.Electrical,
			PeopleNeeded:     1,
			CreatorEmail:     "another@example.com",
			CreatedAt:        now.Add(-1 * time.Hour),
			UpdatedAt:        now.Add(-1 * time.Hour),
			Status:           models.Open,
			Views:            1,
			Applicants:       []string{},
			SelectedUsers:    []string{},
		},
	}

	// Insert all tasks and keep their IDs
	insertResult, err := gt.db.Collection("tasks").InsertMany(gt.ctx, tasks)
	if err != nil {
		t.Fatalf("Failed to seed test tasks: %v", err)
	}

	// Store the IDs for later reference
	for i, id := range insertResult.InsertedIDs {
		gt.taskIDs[i] = id.(primitive.ObjectID)
	}
}

// Test retrieving all available tasks for a user
func TestGetAllTasksForUser(t *testing.T) {
	// Initialize test environment
	gt := &GetAllTasksTest{}
	gt.Initialize(t)
	defer gt.Cleanup(t)

	// Create a request to get all available tasks
	req, _ := http.NewRequest("GET", "/tasks/available/viewer@example.com", nil)

	w := httptest.NewRecorder()
	gt.router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK for task retrieval")

	// Parse the response
	var response struct {
		Tasks []models.Task `json:"tasks"`
		Count int           `json:"count"`
	}

	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")

	// Verify the response contains tasks
	// We should get 4 tasks:
	// - Not including the one created by the viewer
	// - Not including the one the viewer has applied for
	// - Not including the completed task
	assert.Equal(t, 4, response.Count, "Expected 4 tasks to be available")

	// Check that the tasks are properly filtered
	for _, task := range response.Tasks {
		// Should not include viewer's own tasks
		assert.NotEqual(t, "viewer@example.com", task.CreatorEmail, "Should not include viewer's own tasks")

		// Should not include tasks where the viewer is an applicant
		var isApplicant bool
		for _, applicant := range task.Applicants {
			if applicant == "viewer@example.com" {
				isApplicant = true
				break
			}
		}
		assert.False(t, isApplicant, "Should not include tasks where the viewer is an applicant")

		// Should only include Open tasks
		assert.Equal(t, models.Open, task.Status, "Should only include Open tasks")
	}
}

// Test retrieving tasks for a non-existent user
func TestGetAllTasksNonExistentUser(t *testing.T) {
	// Initialize test environment
	gt := &GetAllTasksTest{}
	gt.Initialize(t)
	defer gt.Cleanup(t)

	// Create a request with a non-existent user
	req, _ := http.NewRequest("GET", "/tasks/available/fake@example.com", nil)

	w := httptest.NewRecorder()
	gt.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusUnauthorized, w.Code, "Expected status 401 Unauthorized for non-existent user")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Authentication required. User not found.", response.Error)
}

// Test filtering tasks by category
func TestGetAllTasksFilteredByCategory(t *testing.T) {
	// Initialize test environment
	gt := &GetAllTasksTest{}
	gt.Initialize(t)
	defer gt.Cleanup(t)

	// Create a request to get tasks filtered by category
	req, _ := http.NewRequest("GET", "/tasks/available/viewer@example.com?category=Cleaning", nil)

	w := httptest.NewRecorder()
	gt.router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK for filtered task retrieval")

	// Parse the response
	var response struct {
		Tasks []models.Task `json:"tasks"`
		Count int           `json:"count"`
	}

	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")

	// Verify the response contains only Cleaning tasks
	assert.Greater(t, response.Count, 0, "Expected at least one cleaning task")
	for _, task := range response.Tasks {
		assert.Equal(t, models.Cleaning, task.WorkType, "All tasks should be of Cleaning category")
	}
}

// Test filtering tasks by date range
func TestGetAllTasksFilteredByDateRange(t *testing.T) {
	// Initialize test environment
	gt := &GetAllTasksTest{}
	gt.Initialize(t)
	defer gt.Cleanup(t)

	// Create a request to get tasks filtered by date range
	req, _ := http.NewRequest("GET", "/tasks/available/viewer@example.com?from_date=2025-04-15&to_date=2025-04-25", nil)

	w := httptest.NewRecorder()
	gt.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK for date-filtered task retrieval")

	// Parse the response
	var response struct {
		Tasks []models.Task `json:"tasks"`
		Count int           `json:"count"`
	}

	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")

	// Verify date range filtering
	for _, task := range response.Tasks {
		taskDate := task.TaskDate

		// Check that all tasks fall within the requested date range
		// Date should be >= 2025-04-15 and <= 2025-04-25
		fromDate, _ := time.Parse("2006-01-02", "2025-04-15")
		toDate, _ := time.Parse("2006-01-02", "2025-04-25")

		assert.True(t, !taskDate.Before(fromDate), "Task date should be on or after from_date")
		assert.True(t, !taskDate.After(toDate), "Task date should be on or before to_date")
	}
}

// Test that view count is incremented for each task
func TestViewCountIncremented(t *testing.T) {
	// Initialize test environment
	gt := &GetAllTasksTest{}
	gt.Initialize(t)
	defer gt.Cleanup(t)

	// Keep track of the original view counts
	originalViewCounts := make(map[primitive.ObjectID]int)

	// Get original view counts for all tasks
	for _, taskID := range gt.taskIDs {
		var task models.Task
		err := gt.db.Collection("tasks").FindOne(gt.ctx, bson.M{"_id": taskID}).Decode(&task)
		if err == nil {
			originalViewCounts[taskID] = task.Views
		}
	}

	// Create a request to get all available tasks
	req, _ := http.NewRequest("GET", "/tasks/available/viewer@example.com", nil)

	w := httptest.NewRecorder()
	gt.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK for task retrieval")

	// Parse the response
	var response struct {
		Tasks []models.Task `json:"tasks"`
		Count int           `json:"count"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")

	// Check that view count was incremented for each task in the response
	for _, task := range response.Tasks {
		var updatedTask models.Task
		err = gt.db.Collection("tasks").FindOne(gt.ctx, bson.M{"_id": task.ID}).Decode(&updatedTask)
		assert.NoError(t, err, "Task should still exist in the database")

		originalCount, exists := originalViewCounts[task.ID]
		if exists {
			assert.Equal(t, originalCount+1, updatedTask.Views,
				"View count should be incremented by 1 for task: %s", task.Title)
		}
	}
}
