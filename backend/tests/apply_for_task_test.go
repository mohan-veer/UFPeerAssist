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

// ApplyForTaskTest encapsulates all test dependencies
type ApplyForTaskTest struct {
	client         *mongo.Client
	db             *mongo.Database
	router         *gin.Engine
	openTaskID     primitive.ObjectID
	openTaskIDHex  string
	closedTaskID   primitive.ObjectID
	closedTaskHex  string
	appliedTaskID  primitive.ObjectID
	appliedTaskHex string
	ctx            context.Context
	cancelCtx      context.CancelFunc
}

// Initialize sets up the test environment
func (at *ApplyForTaskTest) Initialize(t *testing.T) {
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
	at.db = at.client.Database("ufpeerassist_test_apply_task")

	// Clear existing data from collections
	at.db.Collection("users").DeleteMany(at.ctx, bson.M{})
	at.db.Collection("tasks").DeleteMany(at.ctx, bson.M{})

	// Seed test data
	at.seedTestData(t)

	// Initialize router with mock handler
	at.router = gin.Default()
	at.router.POST("/tasks/:task_id/apply/:email", at.mockApplyForTask)
}

// Cleanup tears down the test environment
func (at *ApplyForTaskTest) Cleanup(t *testing.T) {
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

// Mock ApplyForTask handler
func (at *ApplyForTaskTest) mockApplyForTask(c *gin.Context) {
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

	// Check if user is the creator (can't apply to own task)
	if task.CreatorEmail == applicantEmail {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot apply to your own task"})
		return
	}

	// Check if user has already applied
	for _, email := range task.Applicants {
		if email == applicantEmail {
			c.JSON(http.StatusBadRequest, gin.H{"error": "You have already applied for this task"})
			return
		}
	}

	// Add user to applicants list
	update := bson.M{
		"$push": bson.M{"applicants": applicantEmail},
	}

	_, err = at.db.Collection("tasks").UpdateOne(
		at.ctx,
		bson.M{"_id": objectID},
		update,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to apply for task", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Successfully applied for task",
	})
}

// Seed the test database with initial data
func (at *ApplyForTaskTest) seedTestData(t *testing.T) {
	// Insert test users
	_, err := at.db.Collection("users").InsertMany(at.ctx, []interface{}{
		models.Users{
			Name:   "Task Creator",
			Email:  "creator@example.com",
			Mobile: "1234567890",
		},
		models.Users{
			Name:   "Task Applicant",
			Email:  "applicant@example.com",
			Mobile: "9876543210",
		},
		models.Users{
			Name:   "Previous Applicant",
			Email:  "previous@example.com",
			Mobile: "5551234567",
		},
	})
	if err != nil {
		t.Fatalf("Failed to seed test users: %v", err)
	}

	// Create test tasks
	now := time.Now()
	taskDate, _ := time.Parse("2006-01-02", "2025-04-15")

	// Open task for testing
	at.openTaskID = primitive.NewObjectID()
	at.openTaskIDHex = at.openTaskID.Hex()

	// Create an open task
	_, err = at.db.Collection("tasks").InsertOne(at.ctx, models.Task{
		ID:               at.openTaskID,
		Title:            "Open Task for Applications",
		Description:      "This is a test task that is open for applications",
		TaskTime:         "14:00",
		TaskDate:         taskDate,
		EstimatedPayRate: 20.0,
		PlaceOfWork:      "Campus",
		WorkType:         models.Cleaning,
		PeopleNeeded:     2,
		CreatorEmail:     "creator@example.com",
		CreatedAt:        now,
		UpdatedAt:        now,
		Status:           models.Open,
		Views:            0,
		Applicants:       []string{},
		SelectedUsers:    []string{},
	})
	if err != nil {
		t.Fatalf("Failed to seed open task: %v", err)
	}

	// Tasks with different statuses for testing
	at.closedTaskID = primitive.NewObjectID()
	at.closedTaskHex = at.closedTaskID.Hex()

	// Create tasks with different statuses
	_, err = at.db.Collection("tasks").InsertOne(at.ctx, models.Task{
		ID:               at.closedTaskID,
		Title:            "Closed Task",
		Description:      "This task is marked as Completed",
		TaskTime:         "15:00",
		TaskDate:         taskDate,
		EstimatedPayRate: 25.0,
		PlaceOfWork:      "Campus",
		WorkType:         models.Tutoring,
		PeopleNeeded:     1,
		CreatorEmail:     "creator@example.com",
		CreatedAt:        now.Add(-24 * time.Hour),
		UpdatedAt:        now,
		Status:           models.Completed, // Task is completed
		Views:            3,
		Applicants:       []string{},
		SelectedUsers:    []string{},
	})
	if err != nil {
		t.Fatalf("Failed to seed closed task: %v", err)
	}

	// Create in-progress task
	inProgressTaskID := primitive.NewObjectID()
	_, err = at.db.Collection("tasks").InsertOne(at.ctx, models.Task{
		ID:               inProgressTaskID,
		Title:            "In Progress Task",
		Description:      "This task is in progress",
		TaskTime:         "16:30",
		TaskDate:         taskDate,
		EstimatedPayRate: 30.0,
		PlaceOfWork:      "Library",
		WorkType:         models.ComputerHelp,
		PeopleNeeded:     1,
		CreatorEmail:     "creator@example.com",
		CreatedAt:        now.Add(-48 * time.Hour),
		UpdatedAt:        now,
		Status:           models.InProgress, // Task is in progress
		Views:            8,
		Applicants:       []string{"applicant@example.com"},
		SelectedUsers:    []string{"applicant@example.com"},
	})
	if err != nil {
		t.Fatalf("Failed to seed in-progress task: %v", err)
	}

	// Create cancelled task
	cancelledTaskID := primitive.NewObjectID()
	_, err = at.db.Collection("tasks").InsertOne(at.ctx, models.Task{
		ID:               cancelledTaskID,
		Title:            "Cancelled Task",
		Description:      "This task is cancelled",
		TaskTime:         "09:00",
		TaskDate:         taskDate,
		EstimatedPayRate: 18.0,
		PlaceOfWork:      "Campus",
		WorkType:         models.Gardening,
		PeopleNeeded:     3,
		CreatorEmail:     "creator@example.com",
		CreatedAt:        now.Add(-72 * time.Hour),
		UpdatedAt:        now,
		Status:           models.Cancelled, // Task is cancelled
		Views:            2,
		Applicants:       []string{},
		SelectedUsers:    []string{},
	})
	if err != nil {
		t.Fatalf("Failed to seed cancelled task: %v", err)
	}

	// Task with existing applicant
	at.appliedTaskID = primitive.NewObjectID()
	at.appliedTaskHex = at.appliedTaskID.Hex()
	_, err = at.db.Collection("tasks").InsertOne(at.ctx, models.Task{
		ID:               at.appliedTaskID,
		Title:            "Task with Applicant",
		Description:      "This task already has an applicant",
		TaskTime:         "17:00",
		TaskDate:         taskDate,
		EstimatedPayRate: 28.0,
		PlaceOfWork:      "Library",
		WorkType:         models.Painting,
		PeopleNeeded:     3,
		CreatorEmail:     "creator@example.com",
		CreatedAt:        now.Add(-36 * time.Hour),
		UpdatedAt:        now,
		Status:           models.Open,
		Views:            4,
		Applicants:       []string{"previous@example.com"},
		SelectedUsers:    []string{},
	})
	if err != nil {
		t.Fatalf("Failed to seed task with applicant: %v", err)
	}
}

// Test successful task application
func TestApplyForTaskSuccess(t *testing.T) {
	// Initialize test environment
	at := &ApplyForTaskTest{}
	at.Initialize(t)
	defer at.Cleanup(t)

	// Create a request to apply for a task
	req, _ := http.NewRequest("POST", "/tasks/"+at.openTaskIDHex+"/apply/applicant@example.com", nil)

	w := httptest.NewRecorder()
	at.router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK for successful task application")

	// Parse the response
	var response struct {
		Message string `json:"message"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Successfully applied for task", response.Message)

	// Check that the user was actually added to the applicants list in the database
	var task models.Task
	err = at.db.Collection("tasks").FindOne(at.ctx, bson.M{"_id": at.openTaskID}).Decode(&task)
	assert.NoError(t, err, "Task should exist in the database")

	// Check if the applicant email is in the list of applicants
	found := false
	for _, email := range task.Applicants {
		if email == "applicant@example.com" {
			found = true
			break
		}
	}
	assert.True(t, found, "Applicant should be added to the applicants list")
}

// Test applying to a nonexistent task
func TestApplyForNonexistentTask(t *testing.T) {
	// Initialize test environment
	at := &ApplyForTaskTest{}
	at.Initialize(t)
	defer at.Cleanup(t)

	// Generate a random, valid ObjectID that doesn't exist in our database
	nonexistentID := primitive.NewObjectID().Hex()

	// Create a request to apply for a nonexistent task
	req, _ := http.NewRequest("POST", "/tasks/"+nonexistentID+"/apply/applicant@example.com", nil)

	w := httptest.NewRecorder()
	at.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusNotFound, w.Code, "Expected status 404 Not Found for nonexistent task")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Task not found", response.Error)
}

// Test applying to your own task
func TestApplyForOwnTask(t *testing.T) {
	// Initialize test environment
	at := &ApplyForTaskTest{}
	at.Initialize(t)
	defer at.Cleanup(t)

	// Create a request for the creator to apply to their own task
	req, _ := http.NewRequest("POST", "/tasks/"+at.openTaskIDHex+"/apply/creator@example.com", nil)

	w := httptest.NewRecorder()
	at.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code, "Expected status 400 Bad Request when applying to own task")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "You cannot apply to your own task", response.Error)
}

// Test applying with a nonexistent user
func TestApplyWithNonexistentUser(t *testing.T) {
	// Initialize test environment
	at := &ApplyForTaskTest{}
	at.Initialize(t)
	defer at.Cleanup(t)

	// Create a request with a nonexistent user
	req, _ := http.NewRequest("POST", "/tasks/"+at.openTaskIDHex+"/apply/nonexistent@example.com", nil)

	w := httptest.NewRecorder()
	at.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusUnauthorized, w.Code, "Expected status 401 Unauthorized for nonexistent user")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Authentication required. User not found.", response.Error)
}

// Test applying with an invalid task ID format
func TestApplyWithInvalidTaskID(t *testing.T) {
	// Initialize test environment
	at := &ApplyForTaskTest{}
	at.Initialize(t)
	defer at.Cleanup(t)

	// Create a request with an invalid task ID
	req, _ := http.NewRequest("POST", "/tasks/invalid-id/apply/applicant@example.com", nil)

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

// Test applying to a completed task
func TestApplyToCompletedTask(t *testing.T) {
	// Initialize test environment
	at := &ApplyForTaskTest{}
	at.Initialize(t)
	defer at.Cleanup(t)

	// Create a request to apply for a completed task
	req, _ := http.NewRequest("POST", "/tasks/"+at.closedTaskHex+"/apply/applicant@example.com", nil)

	w := httptest.NewRecorder()
	at.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code, "Expected status 400 Bad Request when applying to a completed task")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Task is not open for applications", response.Error)
}

// Test applying to a task where user already applied
func TestApplyToTaskAlreadyApplied(t *testing.T) {
	// Initialize test environment
	at := &ApplyForTaskTest{}
	at.Initialize(t)
	defer at.Cleanup(t)

	// Apply with the previous applicant to a task they've already applied for
	req, _ := http.NewRequest("POST", "/tasks/"+at.appliedTaskHex+"/apply/previous@example.com", nil)

	w := httptest.NewRecorder()
	at.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code, "Expected status 400 Bad Request when applying to a task already applied for")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "You have already applied for this task", response.Error)
}
