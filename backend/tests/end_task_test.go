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

// EndTaskTest encapsulates all test dependencies
type EndTaskTest struct {
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
func (et *EndTaskTest) Initialize(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a context with timeout
	et.ctx, et.cancelCtx = context.WithTimeout(context.Background(), 30*time.Second)

	// Connect to MongoDB
	var err error
	et.client, err = mongo.Connect(et.ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Use a test database with a unique name to avoid conflicts
	et.db = et.client.Database("ufpeerassist_test_end_task")

	// Clear existing data from collections
	et.db.Collection("users").DeleteMany(et.ctx, bson.M{})
	et.db.Collection("tasks").DeleteMany(et.ctx, bson.M{})
	et.db.Collection("otp").DeleteMany(et.ctx, bson.M{})
	et.db.Collection("scheduled_tasks").DeleteMany(et.ctx, bson.M{})

	// Seed test data
	et.seedTestData(t)

	// Initialize router with mock handler
	et.router = gin.Default()
	et.router.POST("/tasks/:task_id/end/:email", et.mockEndTask)
}

// Cleanup tears down the test environment
func (et *EndTaskTest) Cleanup(t *testing.T) {
	// Drop the test database
	err := et.db.Drop(et.ctx)
	if err != nil {
		t.Logf("Warning: Failed to drop test database: %v", err)
	}

	// Disconnect from MongoDB
	err = et.client.Disconnect(et.ctx)
	if err != nil {
		t.Logf("Warning: Failed to disconnect from MongoDB: %v", err)
	}

	// Cancel the context
	et.cancelCtx()
}

// Mock EndTask handler
func (et *EndTaskTest) mockEndTask(c *gin.Context) {
	// Get task ID from URL parameter
	taskID := c.Param("task_id")

	// Get worker's email from URL parameter
	workerEmail := c.Param("email")

	// Verify that worker exists
	var worker models.Users
	err := et.db.Collection("users").FindOne(et.ctx, bson.M{"email": workerEmail}).Decode(&worker)
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
	err = et.db.Collection("tasks").FindOne(
		et.ctx,
		bson.M{"_id": objectID},
	).Decode(&task)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// Verify that the worker is one of the selected users for this task
	isSelected := false
	for _, email := range task.SelectedUsers {
		if email == workerEmail {
			isSelected = true
			break
		}
	}

	if !isSelected {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "You are not authorized to end this task"})
		return
	}

	// Generate OTP for task owner
	otp := "123456"                                    // Use fixed OTP for testing
	expirationTime := time.Now().Add(30 * time.Minute) // OTP valid for 30 minutes

	// Define the TaskCompletionOTP struct for testing
	type TaskCompletionOTP struct {
		Email       string             `bson:"email"`
		Code        string             `bson:"code"`
		Expires_At  time.Time          `bson:"expires_at"`
		Context     string             `bson:"context"`
		TaskID      primitive.ObjectID `bson:"task_id"`
		WorkerEmail string             `bson:"worker_email"`
	}

	// Store OTP in the database with task completion context
	_, err = et.db.Collection("otp").UpdateOne(
		et.ctx,
		bson.M{"email": task.CreatorEmail, "task_id": objectID},
		bson.M{"$set": bson.M{
			"code":         otp,
			"expires_at":   expirationTime,
			"context":      "task_completion",
			"task_id":      objectID,
			"worker_email": workerEmail,
		}},
		options.Update().SetUpsert(true),
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate OTP"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Task completion OTP sent to the task owner",
		"task_title": task.Title,
		"task_owner": task.CreatorEmail,
	})
}

// Seed the test database with initial data
func (et *EndTaskTest) seedTestData(t *testing.T) {
	// Insert test users
	_, err := et.db.Collection("users").InsertMany(et.ctx, []interface{}{
		models.Users{
			Name:   "Task Owner",
			Email:  "taskowner@example.com",
			Mobile: "1234567890",
		},
		models.Users{
			Name:   "Selected Worker",
			Email:  "worker@example.com",
			Mobile: "9876543210",
		},
		models.Users{
			Name:   "Other Worker",
			Email:  "otherworker@example.com",
			Mobile: "5551234567",
		},
		models.Users{
			Name:   "Non-Selected Worker",
			Email:  "nonselected@example.com",
			Mobile: "8885551234",
		},
	})
	if err != nil {
		t.Fatalf("Failed to seed test users: %v", err)
	}

	// Create test tasks
	now := time.Now()
	taskDate, _ := time.Parse("2006-01-02", "2025-04-15")

	// Task with selected worker
	et.taskID = primitive.NewObjectID()
	et.taskIDHex = et.taskID.Hex()

	// Create a task with a selected worker
	_, err = et.db.Collection("tasks").InsertOne(et.ctx, models.Task{
		ID:               et.taskID,
		Title:            "Test Task with Selected Worker",
		Description:      "This is a test task with a worker selected",
		TaskTime:         "14:00",
		TaskDate:         taskDate,
		EstimatedPayRate: 20.0,
		PlaceOfWork:      "Campus",
		WorkType:         models.Cleaning,
		PeopleNeeded:     1,
		CreatorEmail:     "taskowner@example.com",
		CreatedAt:        now,
		UpdatedAt:        now,
		Status:           models.InProgress,
		Views:            0,
		Applicants:       []string{"worker@example.com", "nonselected@example.com"},
		SelectedUsers:    []string{"worker@example.com"},
	})
	if err != nil {
		t.Fatalf("Failed to seed task with selected worker: %v", err)
	}

	// Create scheduled task entry
	_, err = et.db.Collection("scheduled_tasks").InsertOne(et.ctx, models.ScheduledTask{
		TaskID:      et.taskID,
		Title:       "Test Task with Selected Worker",
		Poster:      "taskowner@example.com",
		Worker:      "worker@example.com",
		ScheduledAt: now,
		TaskDate:    taskDate,
		TaskTime:    "14:00",
		Place:       "Campus",
	})
	if err != nil {
		t.Fatalf("Failed to seed scheduled task: %v", err)
	}

	// Task with different status
	et.otherTaskID = primitive.NewObjectID()
	et.otherTaskIDHex = et.otherTaskID.Hex()

	// Create another task with a different status
	_, err = et.db.Collection("tasks").InsertOne(et.ctx, models.Task{
		ID:               et.otherTaskID,
		Title:            "Completed Task",
		Description:      "This task is already completed",
		TaskTime:         "16:00",
		TaskDate:         taskDate,
		EstimatedPayRate: 25.0,
		PlaceOfWork:      "Library",
		WorkType:         models.Tutoring,
		PeopleNeeded:     1,
		CreatorEmail:     "taskowner@example.com",
		CreatedAt:        now.Add(-24 * time.Hour),
		UpdatedAt:        now,
		Status:           models.Completed,
		Views:            3,
		Applicants:       []string{"otherworker@example.com"},
		SelectedUsers:    []string{"otherworker@example.com"},
	})
	if err != nil {
		t.Fatalf("Failed to seed completed task: %v", err)
	}
}

// Test successful end task request
func TestEndTaskSuccess(t *testing.T) {
	// Initialize test environment
	et := &EndTaskTest{}
	et.Initialize(t)
	defer et.Cleanup(t)

	// Create a request to end a task by the selected worker
	req, _ := http.NewRequest("POST", "/tasks/"+et.taskIDHex+"/end/worker@example.com", nil)

	w := httptest.NewRecorder()
	et.router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK for successful end task request")

	// Parse the response
	var response struct {
		Message   string `json:"message"`
		TaskTitle string `json:"task_title"`
		TaskOwner string `json:"task_owner"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Task completion OTP sent to the task owner", response.Message)
	assert.Equal(t, "Test Task with Selected Worker", response.TaskTitle)
	assert.Equal(t, "taskowner@example.com", response.TaskOwner)

	// Check that OTP was stored in the database
	var otp struct {
		Email       string             `bson:"email"`
		Code        string             `bson:"code"`
		Expires_At  time.Time          `bson:"expires_at"`
		Context     string             `bson:"context"`
		TaskID      primitive.ObjectID `bson:"task_id"`
		WorkerEmail string             `bson:"worker_email"`
	}
	err = et.db.Collection("otp").FindOne(
		et.ctx,
		bson.M{
			"email":   "taskowner@example.com",
			"task_id": et.taskID,
			"context": "task_completion",
		},
	).Decode(&otp)
	assert.NoError(t, err, "OTP should be stored in the database")
	assert.Equal(t, "123456", otp.Code)
	assert.Equal(t, "task_completion", otp.Context)
	assert.Equal(t, "worker@example.com", otp.WorkerEmail)
}

// Test end task request with non-selected worker
func TestEndTaskNonSelectedWorker(t *testing.T) {
	// Initialize test environment
	et := &EndTaskTest{}
	et.Initialize(t)
	defer et.Cleanup(t)

	// Create a request with a non-selected worker
	req, _ := http.NewRequest("POST", "/tasks/"+et.taskIDHex+"/end/nonselected@example.com", nil)

	w := httptest.NewRecorder()
	et.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusUnauthorized, w.Code, "Expected status 401 Unauthorized for non-selected worker")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "You are not authorized to end this task", response.Error)
}

// Test end task request with non-existent worker
func TestEndTaskNonExistentWorker(t *testing.T) {
	// Initialize test environment
	et := &EndTaskTest{}
	et.Initialize(t)
	defer et.Cleanup(t)

	// Create a request with a non-existent worker
	req, _ := http.NewRequest("POST", "/tasks/"+et.taskIDHex+"/end/nonexistent@example.com", nil)

	w := httptest.NewRecorder()
	et.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusUnauthorized, w.Code, "Expected status 401 Unauthorized for non-existent worker")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Authentication required. User not found.", response.Error)
}

// Test end task request with invalid task ID
func TestEndTaskInvalidTaskID(t *testing.T) {
	// Initialize test environment
	et := &EndTaskTest{}
	et.Initialize(t)
	defer et.Cleanup(t)

	// Create a request with an invalid task ID
	req, _ := http.NewRequest("POST", "/tasks/invalid-id/end/worker@example.com", nil)

	w := httptest.NewRecorder()
	et.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code, "Expected status 400 Bad Request for invalid task ID")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Invalid task ID format", response.Error)
}

// Test end task request with non-existent task
func TestEndTaskNonExistentTask(t *testing.T) {
	// Initialize test environment
	et := &EndTaskTest{}
	et.Initialize(t)
	defer et.Cleanup(t)

	// Generate a random, valid ObjectID that doesn't exist in our database
	nonexistentID := primitive.NewObjectID().Hex()

	// Create a request for a non-existent task
	req, _ := http.NewRequest("POST", "/tasks/"+nonexistentID+"/end/worker@example.com", nil)

	w := httptest.NewRecorder()
	et.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusNotFound, w.Code, "Expected status 404 Not Found for non-existent task")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Task not found", response.Error)
}
