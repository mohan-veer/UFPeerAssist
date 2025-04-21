package tests

import (
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

// AcceptTaskTest encapsulates all test dependencies
type AcceptTaskTest struct {
	client         *mongo.Client
	db             *mongo.Database
	router         *gin.Engine
	taskID         primitive.ObjectID
	taskIDHex      string
	otherTaskID    primitive.ObjectID
	otherTaskIDHex string
	ctx            context.Context
	cancelCtx      context.CancelFunc
}

// Initialize sets up the test environment
func (at *AcceptTaskTest) Initialize(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a context with timeout
	at.ctx, at.cancelCtx = context.WithTimeout(context.Background(), 30*time.Second)

	// Connect to MongoDB
	var err error
	at.client, err = mongo.Connect(at.ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Use a test database with a unique name to avoid conflicts
	at.db = at.client.Database("ufpeerassist_test_accept_task")

	// Clear existing data from collections
	at.db.Collection("users").DeleteMany(at.ctx, bson.M{})
	at.db.Collection("tasks").DeleteMany(at.ctx, bson.M{})
	at.db.Collection("scheduled_tasks").DeleteMany(at.ctx, bson.M{})

	// Seed test data
	at.seedTestData(t)

	// Initialize router with mock handler
	at.router = gin.Default()
	at.router.POST("/tasks/:task_id/accept/:email", at.mockAcceptTask)
}

// Cleanup tears down the test environment
func (at *AcceptTaskTest) Cleanup(t *testing.T) {
	// Drop the test database
	err := at.db.Drop(at.ctx)
	if err != nil {
		t.Logf("Warning: Failed to drop test database: %v", err)
	}

	// Disconnect from MongoDB
	err = at.client.Disconnect(at.ctx)
	if err != nil {
		t.Logf("Warning: Failed to disconnect from MongoDB: %v", err)
	}

	// Cancel the context
	at.cancelCtx()
}

// Mock AcceptTask handler
func (at *AcceptTaskTest) mockAcceptTask(c *gin.Context) {
	// Get task ID from URL parameter
	taskID := c.Param("task_id")

	// Get applicant's email from URL parameter
	applicantEmail := c.Param("email")

	// Verify that applicant exists
	var applicant models.Users
	err := at.db.Collection("users").FindOne(at.ctx, bson.M{"email": applicantEmail}).Decode(&applicant)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required. User not found."})
		return
	}

	// Convert string ID to ObjectID
	objectID, err := primitive.ObjectIDFromHex(taskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID format"})
		return
	}

	// Find the task
	var task models.Task
	err = at.db.Collection("tasks").FindOne(
		at.ctx,
		bson.M{"_id": objectID},
	).Decode(&task)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// Check if task is open
	if task.Status != models.Open {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Task is not open for applications"})
		return
	}

	// Add user to selected list
	update := bson.M{
		"$push": bson.M{"selected_users": applicantEmail},
	}

	_, err = at.db.Collection("tasks").UpdateOne(
		at.ctx,
		bson.M{"_id": objectID},
		update,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept a task", "details": err.Error()})
		return
	}

	// Add task to scheduled tasks
	scheduledTask := models.ScheduledTask{
		TaskID:      task.ID,
		Title:       task.Title,
		Poster:      task.CreatorEmail,
		Worker:      applicantEmail,
		ScheduledAt: time.Now(),
		TaskDate:    task.TaskDate,
		TaskTime:    task.TaskTime,
		Place:       task.PlaceOfWork,
	}

	_, err = at.db.Collection("scheduled_tasks").InsertOne(at.ctx, scheduledTask)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to schedule task"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Successfully accepted the task",
	})
}

// Seed the test database with initial data
func (at *AcceptTaskTest) seedTestData(t *testing.T) {
	// Insert test users
	_, err := at.db.Collection("users").InsertMany(at.ctx, []interface{}{
		models.Users{
			Name:   "Task Owner",
			Email:  "taskowner@example.com",
			Mobile: "1234567890",
		},
		models.Users{
			Name:   "Applicant",
			Email:  "applicant@example.com",
			Mobile: "9876543210",
		},
		models.Users{
			Name:   "Non Applicant",
			Email:  "nonapplicant@example.com",
			Mobile: "5551234567",
		},
	})
	if err != nil {
		t.Fatalf("Failed to seed test users: %v", err)
	}

	// Create test tasks
	now := time.Now()
	taskDate, _ := time.Parse("2006-01-02", "2025-04-15")

	// Open task with applicants
	at.taskID = primitive.NewObjectID()
	at.taskIDHex = at.taskID.Hex()

	// Create an open task with applicants
	_, err = at.db.Collection("tasks").InsertOne(at.ctx, models.Task{
		ID:               at.taskID,
		Title:            "Test Open Task",
		Description:      "This is a test task that is open for applications",
		TaskTime:         "14:00",
		TaskDate:         taskDate,
		EstimatedPayRate: 20.0,
		PlaceOfWork:      "Campus",
		WorkType:         models.Cleaning,
		PeopleNeeded:     1,
		CreatorEmail:     "taskowner@example.com",
		CreatedAt:        now,
		UpdatedAt:        now,
		Status:           models.Open,
		Views:            0,
		Applicants:       []string{"applicant@example.com"},
		SelectedUsers:    []string{},
	})
	if err != nil {
		t.Fatalf("Failed to seed open task: %v", err)
	}

	// Task with different status (in progress)
	at.otherTaskID = primitive.NewObjectID()
	at.otherTaskIDHex = at.otherTaskID.Hex()

	// Create a task that is in progress
	_, err = at.db.Collection("tasks").InsertOne(at.ctx, models.Task{
		ID:               at.otherTaskID,
		Title:            "In Progress Task",
		Description:      "This task is already in progress",
		TaskTime:         "16:00",
		TaskDate:         taskDate,
		EstimatedPayRate: 25.0,
		PlaceOfWork:      "Library",
		WorkType:         models.Tutoring,
		PeopleNeeded:     1,
		CreatorEmail:     "taskowner@example.com",
		CreatedAt:        now.Add(-24 * time.Hour),
		UpdatedAt:        now,
		Status:           models.InProgress,
		Views:            3,
		Applicants:       []string{"applicant@example.com"},
		SelectedUsers:    []string{"applicant@example.com"},
	})
	if err != nil {
		t.Fatalf("Failed to seed in-progress task: %v", err)
	}
}

// Test successful accept task request
func TestAcceptTaskSuccess(t *testing.T) {
	// Initialize test environment
	at := &AcceptTaskTest{}
	at.Initialize(t)
	defer at.Cleanup(t)

	// Create a request to accept a task for an applicant
	req, _ := http.NewRequest("POST", "/tasks/"+at.taskIDHex+"/accept/applicant@example.com", nil)

	w := httptest.NewRecorder()
	at.router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK for successful accept task request")

	// Parse the response
	var response struct {
		Message string `json:"message"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Successfully accepted the task", response.Message)

	// Check that the task was updated in the database
	var updatedTask models.Task
	err = at.db.Collection("tasks").FindOne(
		at.ctx,
		bson.M{"_id": at.taskID},
	).Decode(&updatedTask)
	assert.NoError(t, err, "Task should exist in the database")
	assert.Contains(t, updatedTask.SelectedUsers, "applicant@example.com", "Applicant should be added to selected users")

	// Check that the scheduled task was created
	var scheduledTask models.ScheduledTask
	err = at.db.Collection("scheduled_tasks").FindOne(
		at.ctx,
		bson.M{"task_id": at.taskID},
	).Decode(&scheduledTask)
	assert.NoError(t, err, "Scheduled task should be created in the database")
	assert.Equal(t, "applicant@example.com", scheduledTask.Worker, "Worker should be the accepted applicant")
	assert.Equal(t, "Test Open Task", scheduledTask.Title, "Scheduled task should have the correct title")
}

// Test accept task request with non-existent applicant
func TestAcceptTaskNonExistentApplicant(t *testing.T) {
	// Initialize test environment
	at := &AcceptTaskTest{}
	at.Initialize(t)
	defer at.Cleanup(t)

	// Create a request with a non-existent applicant
	req, _ := http.NewRequest("POST", "/tasks/"+at.taskIDHex+"/accept/nonexistent@example.com", nil)

	w := httptest.NewRecorder()
	at.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusUnauthorized, w.Code, "Expected status 401 Unauthorized for non-existent applicant")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Authentication required. User not found.", response.Error)
}

// Test accept task request with invalid task ID
func TestAcceptTaskInvalidTaskID(t *testing.T) {
	// Initialize test environment
	at := &AcceptTaskTest{}
	at.Initialize(t)
	defer at.Cleanup(t)

	// Create a request with an invalid task ID
	req, _ := http.NewRequest("POST", "/tasks/invalid-id/accept/applicant@example.com", nil)

	w := httptest.NewRecorder()
	at.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code, "Expected status 400 Bad Request for invalid task ID")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Invalid task ID format", response.Error)
}

// Test accept task request with non-existent task
func TestAcceptTaskNonExistentTask(t *testing.T) {
	// Initialize test environment
	at := &AcceptTaskTest{}
	at.Initialize(t)
	defer at.Cleanup(t)

	// Generate a random, valid ObjectID that doesn't exist in our database
	nonexistentID := primitive.NewObjectID().Hex()

	// Create a request for a non-existent task
	req, _ := http.NewRequest("POST", "/tasks/"+nonexistentID+"/accept/applicant@example.com", nil)

	w := httptest.NewRecorder()
	at.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusNotFound, w.Code, "Expected status 404 Not Found for non-existent task")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Task not found", response.Error)
}

// Test accept task request for a non-open task
func TestAcceptTaskNonOpenTask(t *testing.T) {
	// Initialize test environment
	at := &AcceptTaskTest{}
	at.Initialize(t)
	defer at.Cleanup(t)

	// Create a request for a task that is not open
	req, _ := http.NewRequest("POST", "/tasks/"+at.otherTaskIDHex+"/accept/applicant@example.com", nil)

	w := httptest.NewRecorder()
	at.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code, "Expected status 400 Bad Request for non-open task")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Task is not open for applications", response.Error)
}

// Test accept task request for non-applicant
func TestAcceptTaskNonApplicant(t *testing.T) {
	// Initialize test environment
	at := &AcceptTaskTest{}
	at.Initialize(t)
	defer at.Cleanup(t)

	// Create a request for a user who hasn't applied
	req, _ := http.NewRequest("POST", "/tasks/"+at.taskIDHex+"/accept/nonapplicant@example.com", nil)

	w := httptest.NewRecorder()
	at.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Should still accept the task even if user didn't apply")

	// Parse the response
	var response struct {
		Message string `json:"message"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Successfully accepted the task", response.Message)

	// Check that the user was added to selected users
	var updatedTask models.Task
	err = at.db.Collection("tasks").FindOne(
		at.ctx,
		bson.M{"_id": at.taskID},
	).Decode(&updatedTask)
	assert.NoError(t, err)
	assert.Contains(t, updatedTask.SelectedUsers, "nonapplicant@example.com")
}
