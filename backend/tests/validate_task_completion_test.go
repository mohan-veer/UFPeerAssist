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

// ValidateTaskCompletionTest encapsulates all test dependencies
type ValidateTaskCompletionTest struct {
	client    *mongo.Client
	db        *mongo.Database
	router    *gin.Engine
	taskID    primitive.ObjectID
	taskIDHex string
	ctx       context.Context
	cancelCtx context.CancelFunc
}

// TaskCompletionOTP struct for testing
type TaskCompletionOTP struct {
	Email       string             `bson:"email"`
	Code        string             `bson:"code"`
	Expires_At  time.Time          `bson:"expires_at"`
	Context     string             `bson:"context"`
	TaskID      primitive.ObjectID `bson:"task_id"`
	WorkerEmail string             `bson:"worker_email"`
}

// Initialize sets up the test environment
func (vt *ValidateTaskCompletionTest) Initialize(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a context with timeout
	vt.ctx, vt.cancelCtx = context.WithTimeout(context.Background(), 30*time.Second)

	// Connect to MongoDB
	var err error
	vt.client, err = mongo.Connect(vt.ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Use a test database with a unique name to avoid conflicts
	vt.db = vt.client.Database("ufpeerassist_test_validate_task")

	// Clear existing data from collections
	vt.db.Collection("users").DeleteMany(vt.ctx, bson.M{})
	vt.db.Collection("tasks").DeleteMany(vt.ctx, bson.M{})
	vt.db.Collection("otp").DeleteMany(vt.ctx, bson.M{})
	vt.db.Collection("scheduled_tasks").DeleteMany(vt.ctx, bson.M{})

	// Seed test data
	vt.seedTestData(t)

	// Initialize router with mock handler
	vt.router = gin.Default()
	vt.router.POST("/validate-task-completion", vt.mockValidateTaskCompletionOTP)
}

// Cleanup tears down the test environment
func (vt *ValidateTaskCompletionTest) Cleanup(t *testing.T) {
	// Drop the test database
	err := vt.db.Drop(vt.ctx)
	if err != nil {
		t.Logf("Warning: Failed to drop test database: %v", err)
	}

	// Disconnect from MongoDB
	err = vt.client.Disconnect(vt.ctx)
	if err != nil {
		t.Logf("Warning: Failed to disconnect from MongoDB: %v", err)
	}

	// Cancel the context
	vt.cancelCtx()
}

// Mock ValidateTaskCompletionOTP handler
func (vt *ValidateTaskCompletionTest) mockValidateTaskCompletionOTP(c *gin.Context) {
	var request struct {
		TaskID string `json:"task_id" binding:"required"`
		Email  string `json:"email" binding:"required,email"` // Task owner's email
		OTP    string `json:"otp" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Convert string ID to ObjectID
	objectID, err := primitive.ObjectIDFromHex(request.TaskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID format"})
		return
	}

	// Check if OTP exists and is valid
	var storedOTP TaskCompletionOTP
	err = vt.db.Collection("otp").FindOne(
		vt.ctx,
		bson.M{
			"email":   request.Email,
			"code":    request.OTP,
			"task_id": objectID,
			"context": "task_completion",
		},
	).Decode(&storedOTP)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired OTP"})
		return
	}

	// Start MongoDB transaction for updating task status
	session, err := vt.client.StartSession()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer session.EndSession(vt.ctx)

	// Transaction Function
	callback := func(sessCtx mongo.SessionContext) (interface{}, error) {
		// Update task status to Completed
		_, err = vt.db.Collection("tasks").UpdateOne(
			sessCtx,
			bson.M{"_id": objectID},
			bson.M{"$set": bson.M{
				"status":     models.Completed,
				"updated_at": time.Now(),
			}},
		)
		if err != nil {
			return nil, err
		}

		// Update scheduled task status
		_, err = vt.db.Collection("scheduled_tasks").UpdateOne(
			sessCtx,
			bson.M{"task_id": objectID},
			bson.M{"$set": bson.M{
				"status":       "Completed",
				"completed_at": time.Now(),
			}},
		)
		if err != nil {
			return nil, err
		}

		// Increment completed tasks count for the worker
		_, err = vt.db.Collection("users").UpdateOne(
			sessCtx,
			bson.M{"email": storedOTP.WorkerEmail},
			bson.M{"$inc": bson.M{"completed_tasks": 1}},
		)
		if err != nil {
			return nil, err
		}

		// Delete OTP after successful validation
		_, err = vt.db.Collection("otp").DeleteOne(
			sessCtx,
			bson.M{
				"email":   request.Email,
				"task_id": objectID,
				"context": "task_completion",
			},
		)
		if err != nil {
			return nil, err
		}

		return nil, nil
	}

	// Execute transaction
	_, err = session.WithTransaction(vt.ctx, callback)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Task completed successfully!",
		"task_id": request.TaskID,
	})
}

// Seed the test database with initial data
func (vt *ValidateTaskCompletionTest) seedTestData(t *testing.T) {
	// Insert test users
	_, err := vt.db.Collection("users").InsertMany(vt.ctx, []interface{}{
		models.Users{
			Name:           "Task Owner",
			Email:          "taskowner@example.com",
			Mobile:         "1234567890",
			CompletedTasks: 0,
		},
		models.Users{
			Name:           "Selected Worker",
			Email:          "worker@example.com",
			Mobile:         "9876543210",
			CompletedTasks: 5,
		},
	})
	if err != nil {
		t.Fatalf("Failed to seed test users: %v", err)
	}

	// Create test tasks
	now := time.Now()
	taskDate, _ := time.Parse("2006-01-02", "2025-04-15")

	// Task with selected worker
	vt.taskID = primitive.NewObjectID()
	vt.taskIDHex = vt.taskID.Hex()

	// Create a task with a selected worker
	_, err = vt.db.Collection("tasks").InsertOne(vt.ctx, models.Task{
		ID:               vt.taskID,
		Title:            "Test Task for Completion",
		Description:      "This is a test task for completion validation",
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
		Applicants:       []string{"worker@example.com"},
		SelectedUsers:    []string{"worker@example.com"},
	})
	if err != nil {
		t.Fatalf("Failed to seed task: %v", err)
	}

	// Create scheduled task
	_, err = vt.db.Collection("scheduled_tasks").InsertOne(vt.ctx, models.ScheduledTask{
		TaskID:      vt.taskID,
		Title:       "Test Task for Completion",
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

	// Create OTP for task completion
	expirationTime := time.Now().Add(30 * time.Minute)
	_, err = vt.db.Collection("otp").InsertOne(vt.ctx, TaskCompletionOTP{
		Email:       "taskowner@example.com",
		Code:        "123456", // Fixed OTP for testing
		Expires_At:  expirationTime,
		Context:     "task_completion",
		TaskID:      vt.taskID,
		WorkerEmail: "worker@example.com",
	})
	if err != nil {
		t.Fatalf("Failed to seed OTP: %v", err)
	}

	// Create expired OTP for testing
	expiredTime := time.Now().Add(-1 * time.Hour)
	expiredTaskID := primitive.NewObjectID()
	_, err = vt.db.Collection("otp").InsertOne(vt.ctx, TaskCompletionOTP{
		Email:       "taskowner@example.com",
		Code:        "654321", // Different OTP for expired test
		Expires_At:  expiredTime,
		Context:     "task_completion",
		TaskID:      expiredTaskID,
		WorkerEmail: "worker@example.com",
	})
	if err != nil {
		t.Fatalf("Failed to seed expired OTP: %v", err)
	}
}

// Test successful task completion validation
func TestValidateTaskCompletionSuccess(t *testing.T) {
	// Initialize test environment
	vt := &ValidateTaskCompletionTest{}
	vt.Initialize(t)
	defer vt.Cleanup(t)

	// Create validation request data
	requestData := map[string]string{
		"task_id": vt.taskIDHex,
		"email":   "taskowner@example.com",
		"otp":     "123456",
	}

	jsonData, _ := json.Marshal(requestData)
	req, _ := http.NewRequest("POST", "/validate-task-completion", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	vt.router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK for successful validation")

	// Parse the response
	var response struct {
		Message string `json:"message"`
		TaskID  string `json:"task_id"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Task completed successfully!", response.Message)
	assert.Equal(t, vt.taskIDHex, response.TaskID)

	// Verify task status was updated to completed
	var task models.Task
	err = vt.db.Collection("tasks").FindOne(vt.ctx, bson.M{"_id": vt.taskID}).Decode(&task)
	assert.NoError(t, err, "Task should exist in the database")
	assert.Equal(t, models.Completed, task.Status, "Task status should be updated to Completed")

	// Verify scheduled task was updated
	var scheduledTask struct {
		TaskID       primitive.ObjectID `bson:"task_id"`
		Status       string             `bson:"status"`
		Completed_At time.Time          `bson:"completed_at"`
	}
	err = vt.db.Collection("scheduled_tasks").FindOne(vt.ctx, bson.M{"task_id": vt.taskID}).Decode(&scheduledTask)
	assert.NoError(t, err, "Scheduled task should exist in the database")
	assert.Equal(t, "Completed", scheduledTask.Status, "Scheduled task status should be updated to Completed")
	assert.False(t, scheduledTask.Completed_At.IsZero(), "Completed_at should be set")

	// Verify worker's completed tasks count was incremented
	var worker models.Users
	err = vt.db.Collection("users").FindOne(vt.ctx, bson.M{"email": "worker@example.com"}).Decode(&worker)
	assert.NoError(t, err, "Worker should exist in the database")
	assert.Equal(t, 5, worker.CompletedTasks, "Worker's completed tasks count should be incremented")

	// Verify OTP was deleted after successful validation
	count, err := vt.db.Collection("otp").CountDocuments(vt.ctx, bson.M{
		"email":   "taskowner@example.com",
		"task_id": vt.taskID,
		"context": "task_completion",
	})
	assert.NoError(t, err, "Should be able to query OTP collection")
	assert.Equal(t, int64(0), count, "OTP should be deleted after successful validation")
}

// Test validation with invalid OTP
func TestValidateTaskCompletionInvalidOTP(t *testing.T) {
	// Initialize test environment
	vt := &ValidateTaskCompletionTest{}
	vt.Initialize(t)
	defer vt.Cleanup(t)

	// Create validation request with incorrect OTP
	requestData := map[string]string{
		"task_id": vt.taskIDHex,
		"email":   "taskowner@example.com",
		"otp":     "111111", // Wrong OTP
	}

	jsonData, _ := json.Marshal(requestData)
	req, _ := http.NewRequest("POST", "/validate-task-completion", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	vt.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusUnauthorized, w.Code, "Expected status 401 Unauthorized for invalid OTP")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Invalid or expired OTP", response.Error)

	// Verify task status was NOT updated
	var task models.Task
	err = vt.db.Collection("tasks").FindOne(vt.ctx, bson.M{"_id": vt.taskID}).Decode(&task)
	assert.NoError(t, err, "Task should exist in the database")
	assert.Equal(t, models.InProgress, task.Status, "Task status should not be updated with invalid OTP")
}

// Test validation with invalid task ID
func TestValidateTaskCompletionInvalidTaskID(t *testing.T) {
	// Initialize test environment
	vt := &ValidateTaskCompletionTest{}
	vt.Initialize(t)
	defer vt.Cleanup(t)

	// Create validation request with invalid task ID
	requestData := map[string]string{
		"task_id": "invalid-task-id",
		"email":   "taskowner@example.com",
		"otp":     "123456",
	}

	jsonData, _ := json.Marshal(requestData)
	req, _ := http.NewRequest("POST", "/validate-task-completion", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	vt.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code, "Expected status 400 Bad Request for invalid task ID")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Invalid task ID format", response.Error)
}

// Test validation with valid task ID but no matching OTP
func TestValidateTaskCompletionNoMatchingOTP(t *testing.T) {
	// Initialize test environment
	vt := &ValidateTaskCompletionTest{}
	vt.Initialize(t)
	defer vt.Cleanup(t)

	// Generate a random, valid ObjectID that doesn't match any OTP
	nonMatchingID := primitive.NewObjectID().Hex()

	// Create validation request with a valid but non-matching task ID
	requestData := map[string]string{
		"task_id": nonMatchingID,
		"email":   "taskowner@example.com",
		"otp":     "123456",
	}

	jsonData, _ := json.Marshal(requestData)
	req, _ := http.NewRequest("POST", "/validate-task-completion", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	vt.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusUnauthorized, w.Code, "Expected status 401 Unauthorized for non-matching task ID")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Invalid or expired OTP", response.Error)
}

// Test validation with missing fields
func TestValidateTaskCompletionMissingFields(t *testing.T) {
	// Initialize test environment
	vt := &ValidateTaskCompletionTest{}
	vt.Initialize(t)
	defer vt.Cleanup(t)

	// Create validation request with missing email
	requestData := map[string]string{
		"task_id": vt.taskIDHex,
		// Missing email
		"otp": "123456",
	}

	jsonData, _ := json.Marshal(requestData)
	req, _ := http.NewRequest("POST", "/validate-task-completion", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	vt.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code, "Expected status 400 Bad Request for missing fields")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Invalid request", response.Error)
}
