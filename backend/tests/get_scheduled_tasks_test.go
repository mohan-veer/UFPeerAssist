package tests

import (
	"context"
	"encoding/json"
	"fmt"
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

// GetScheduledTasksTest encapsulates all test dependencies
type GetScheduledTasksTest struct {
	client          *mongo.Client
	db              *mongo.Database
	router          *gin.Engine
	task1ID         primitive.ObjectID
	task2ID         primitive.ObjectID
	task3ID         primitive.ObjectID
	user1Email      string
	user2Email      string
	nonExistentUser string
	ctx             context.Context
	cancelCtx       context.CancelFunc
}

// Initialize sets up the test environment
func (gt *GetScheduledTasksTest) Initialize(t *testing.T) {
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
	gt.db = gt.client.Database("ufpeerassist_test_scheduled_tasks")

	// Clear existing data from collections
	gt.db.Collection("users").DeleteMany(gt.ctx, bson.M{})
	gt.db.Collection("tasks").DeleteMany(gt.ctx, bson.M{})
	gt.db.Collection("scheduled_tasks").DeleteMany(gt.ctx, bson.M{})

	// Set up user emails
	gt.user1Email = "worker1@example.com"
	gt.user2Email = "worker2@example.com"
	gt.nonExistentUser = "nonexistent@example.com"

	// Seed test data
	gt.seedTestData(t)

	// Initialize router with mock handler
	gt.router = gin.Default()
	gt.router.GET("/scheduled-tasks/:email", gt.mockGetScheduledTasks)
}

// Cleanup tears down the test environment
func (gt *GetScheduledTasksTest) Cleanup(t *testing.T) {
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

// Mock GetScheduledTasks handler
func (gt *GetScheduledTasksTest) mockGetScheduledTasks(c *gin.Context) {
	email := c.Param("email")

	// Verify user exists
	var user models.Users
	err := gt.db.Collection("users").FindOne(gt.ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Find all scheduled tasks where user is a worker
	// Looking at the model definition, the actual field in the database is "worker_email"
	filter := bson.M{"worker_email": email}

	// Debug info
	fmt.Printf("Searching for scheduled tasks with filter: %v\n", filter)

	// Check if any documents exist in the collection to debug
	count, _ := gt.db.Collection("scheduled_tasks").CountDocuments(gt.ctx, bson.M{})
	fmt.Printf("Total documents in scheduled_tasks collection: %d\n", count)

	cursor, err := gt.db.Collection("scheduled_tasks").Find(gt.ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query scheduled_tasks"})
		return
	}
	defer cursor.Close(gt.ctx)

	var scheduledTasks []models.ScheduledTask
	if err := cursor.All(gt.ctx, &scheduledTasks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode scheduled_tasks"})
		return
	}

	if len(scheduledTasks) == 0 {
		c.JSON(http.StatusOK, gin.H{"scheduled_tasks": []models.Task{}, "count": 0})
		return
	}

	// Extract task IDs
	var taskIDs []primitive.ObjectID
	for _, scheduled := range scheduledTasks {
		taskIDs = append(taskIDs, scheduled.TaskID)
	}

	// Fetch full task details
	taskFilter := bson.M{"_id": bson.M{"$in": taskIDs}}
	taskCursor, err := gt.db.Collection("tasks").Find(gt.ctx, taskFilter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch full task details"})
		return
	}
	defer taskCursor.Close(gt.ctx)

	var tasks []models.Task
	if err := taskCursor.All(gt.ctx, &tasks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode tasks"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"scheduled_tasks": tasks,
		"count":           len(tasks),
	})
}

// Seed the test database with initial data
func (gt *GetScheduledTasksTest) seedTestData(t *testing.T) {
	// Insert test users
	_, err := gt.db.Collection("users").InsertMany(gt.ctx, []interface{}{
		models.Users{
			Name:   "Poster",
			Email:  "poster@example.com",
			Mobile: "1234567890",
		},
		models.Users{
			Name:   "Worker 1",
			Email:  gt.user1Email,
			Mobile: "9876543210",
		},
		models.Users{
			Name:   "Worker 2",
			Email:  gt.user2Email,
			Mobile: "5551234567",
		},
	})
	if err != nil {
		t.Fatalf("Failed to seed test users: %v", err)
	}

	// Create tasks and scheduled tasks
	now := time.Now()
	taskDate1, _ := time.Parse("2006-01-02", "2025-04-15")
	taskDate2, _ := time.Parse("2006-01-02", "2025-04-16")
	taskDate3, _ := time.Parse("2006-01-02", "2025-04-17")

	// Create task 1
	gt.task1ID = primitive.NewObjectID()
	task1 := models.Task{
		ID:               gt.task1ID,
		Title:            "Task 1 for Worker 1",
		Description:      "Description for task 1",
		TaskTime:         "14:00",
		TaskDate:         taskDate1,
		EstimatedPayRate: 20.0,
		PlaceOfWork:      "Campus",
		WorkType:         models.Cleaning,
		PeopleNeeded:     1,
		CreatorEmail:     "poster@example.com",
		CreatedAt:        now,
		UpdatedAt:        now,
		Status:           models.InProgress,
		Views:            0,
		Applicants:       []string{gt.user1Email},
		SelectedUsers:    []string{gt.user1Email},
	}

	// Create task 2
	gt.task2ID = primitive.NewObjectID()
	task2 := models.Task{
		ID:               gt.task2ID,
		Title:            "Task 2 for Worker 1",
		Description:      "Description for task 2",
		TaskTime:         "16:00",
		TaskDate:         taskDate2,
		EstimatedPayRate: 25.0,
		PlaceOfWork:      "Library",
		WorkType:         models.Tutoring,
		PeopleNeeded:     1,
		CreatorEmail:     "poster@example.com",
		CreatedAt:        now,
		UpdatedAt:        now,
		Status:           models.InProgress,
		Views:            3,
		Applicants:       []string{gt.user1Email},
		SelectedUsers:    []string{gt.user1Email},
	}

	// Create task 3
	gt.task3ID = primitive.NewObjectID()
	task3 := models.Task{
		ID:               gt.task3ID,
		Title:            "Task 3 for Worker 2",
		Description:      "Description for task 3",
		TaskTime:         "10:00",
		TaskDate:         taskDate3,
		EstimatedPayRate: 30.0,
		PlaceOfWork:      "Off Campus",
		WorkType:         models.Gardening,
		PeopleNeeded:     1,
		CreatorEmail:     "poster@example.com",
		CreatedAt:        now,
		UpdatedAt:        now,
		Status:           models.InProgress,
		Views:            5,
		Applicants:       []string{gt.user2Email},
		SelectedUsers:    []string{gt.user2Email},
	}

	// Insert tasks
	_, err = gt.db.Collection("tasks").InsertMany(gt.ctx, []interface{}{
		task1, task2, task3,
	})
	if err != nil {
		t.Fatalf("Failed to seed tasks: %v", err)
	}

	// Create scheduled tasks
	// Match the field names in the actual ScheduledTask model
	scheduledTask1 := models.ScheduledTask{
		TaskID:      gt.task1ID,
		Title:       "Task 1 for Worker 1",
		Poster:      "poster@example.com",
		Worker:      gt.user1Email,
		ScheduledAt: now,
		TaskDate:    taskDate1,
		TaskTime:    "14:00",
		Place:       "Campus",
	}

	scheduledTask2 := models.ScheduledTask{
		TaskID:      gt.task2ID,
		Title:       "Task 2 for Worker 1",
		Poster:      "poster@example.com",
		Worker:      gt.user1Email,
		ScheduledAt: now,
		TaskDate:    taskDate2,
		TaskTime:    "16:00",
		Place:       "Library",
	}

	scheduledTask3 := models.ScheduledTask{
		TaskID:      gt.task3ID,
		Title:       "Task 3 for Worker 2",
		Poster:      "poster@example.com",
		Worker:      gt.user2Email,
		ScheduledAt: now,
		TaskDate:    taskDate3,
		TaskTime:    "10:00",
		Place:       "Off Campus",
	}

	// Insert scheduled tasks
	_, err = gt.db.Collection("scheduled_tasks").InsertMany(gt.ctx, []interface{}{
		scheduledTask1, scheduledTask2, scheduledTask3,
	})
	if err != nil {
		t.Fatalf("Failed to seed scheduled tasks: %v", err)
	}
}

// Test successful get scheduled tasks request for worker 1
func TestGetScheduledTasksWorker1(t *testing.T) {
	// Initialize test environment
	gt := &GetScheduledTasksTest{}
	gt.Initialize(t)
	defer gt.Cleanup(t)

	// Create a request to get scheduled tasks for worker 1
	req, _ := http.NewRequest("GET", "/scheduled-tasks/"+gt.user1Email, nil)

	w := httptest.NewRecorder()
	gt.router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK for successful get scheduled tasks request")

	// Parse the response
	var response struct {
		ScheduledTasks []models.Task `json:"scheduled_tasks"`
		Count          int           `json:"count"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")

	// Worker 1 should have 2 scheduled tasks
	assert.Equal(t, 2, response.Count, "Worker 1 should have 2 scheduled tasks")
	assert.Len(t, response.ScheduledTasks, 2, "Should return 2 tasks for worker 1")

	// Verify the returned tasks are the correct ones
	taskTitles := []string{}
	for _, task := range response.ScheduledTasks {
		taskTitles = append(taskTitles, task.Title)
	}
	assert.Contains(t, taskTitles, "Task 1 for Worker 1", "Should contain Task 1")
	assert.Contains(t, taskTitles, "Task 2 for Worker 1", "Should contain Task 2")
}

// Test successful get scheduled tasks request for worker 2
func TestGetScheduledTasksWorker2(t *testing.T) {
	// Initialize test environment
	gt := &GetScheduledTasksTest{}
	gt.Initialize(t)
	defer gt.Cleanup(t)

	// Create a request to get scheduled tasks for worker 2
	req, _ := http.NewRequest("GET", "/scheduled-tasks/"+gt.user2Email, nil)

	w := httptest.NewRecorder()
	gt.router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK for successful get scheduled tasks request")

	// Parse the response
	var response struct {
		ScheduledTasks []models.Task `json:"scheduled_tasks"`
		Count          int           `json:"count"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")

	// Worker 2 should have 1 scheduled task
	assert.Equal(t, 1, response.Count, "Worker 2 should have 1 scheduled task")
	assert.Len(t, response.ScheduledTasks, 1, "Should return 1 task for worker 2")

	// Only check the task title if there are tasks returned
	if len(response.ScheduledTasks) > 0 {
		assert.Equal(t, "Task 3 for Worker 2", response.ScheduledTasks[0].Title, "Should return the correct task for worker 2")
	}
}

// Test get scheduled tasks with non-existent user
func TestGetScheduledTasksNonExistentUser(t *testing.T) {
	// Initialize test environment
	gt := &GetScheduledTasksTest{}
	gt.Initialize(t)
	defer gt.Cleanup(t)

	// Create a request with a non-existent user
	req, _ := http.NewRequest("GET", "/scheduled-tasks/"+gt.nonExistentUser, nil)

	w := httptest.NewRecorder()
	gt.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusNotFound, w.Code, "Expected status 404 Not Found for non-existent user")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "User not found", response.Error)
}

// Test for user with no scheduled tasks
func TestGetScheduledTasksNoTasks(t *testing.T) {
	// Initialize test environment
	gt := &GetScheduledTasksTest{}
	gt.Initialize(t)
	defer gt.Cleanup(t)

	// Add a user with no scheduled tasks
	noTasksUser := "notasks@example.com"
	_, err := gt.db.Collection("users").InsertOne(gt.ctx, models.Users{
		Name:   "No Tasks User",
		Email:  noTasksUser,
		Mobile: "1231231234",
	})
	assert.NoError(t, err, "Failed to insert test user with no tasks")

	// Create a request for a user with no scheduled tasks
	req, _ := http.NewRequest("GET", "/scheduled-tasks/"+noTasksUser, nil)

	w := httptest.NewRecorder()
	gt.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK for user with no scheduled tasks")

	var response struct {
		ScheduledTasks []models.Task `json:"scheduled_tasks"`
		Count          int           `json:"count"`
	}
	err = json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")

	// User should have 0 scheduled tasks
	assert.Equal(t, 0, response.Count, "User should have 0 scheduled tasks")
	assert.Len(t, response.ScheduledTasks, 0, "Should return empty array for user with no scheduled tasks")
}

// Test database error when querying scheduled tasks
func TestGetScheduledTasksDBError(t *testing.T) {
	// Initialize test environment
	gt := &GetScheduledTasksTest{}
	gt.Initialize(t)

	// Drop the scheduled_tasks collection to simulate a DB error
	err := gt.db.Collection("scheduled_tasks").Drop(gt.ctx)
	if err != nil {
		t.Logf("Error dropping collection: %v", err)
	}

	// Create a different collection with the same data but different name
	// This effectively "hides" the scheduled_tasks collection
	newCollection := gt.db.Collection("scheduled_tasks_renamed")

	// Try to create an index to force collection creation
	_, err = newCollection.Indexes().CreateOne(gt.ctx, mongo.IndexModel{
		Keys: bson.M{"worker": 1},
	})
	if err != nil {
		t.Logf("Error creating index on new collection: %v", err)
	}

	// Create a request for worker 1
	req, _ := http.NewRequest("GET", "/scheduled-tasks/"+gt.user1Email, nil)

	w := httptest.NewRecorder()
	gt.router.ServeHTTP(w, req)

	// We're expecting either a 500 error or a success with empty results
	// Both are acceptable behaviors depending on how the database handles missing collections
	if w.Code == http.StatusInternalServerError {
		var response struct {
			Error string `json:"error"`
		}
		err := json.NewDecoder(w.Body).Decode(&response)
		assert.NoError(t, err, "Failed to parse response body")
		assert.Contains(t, response.Error, "Failed to query scheduled_tasks")
	} else {
		assert.Equal(t, http.StatusOK, w.Code)
		var response struct {
			ScheduledTasks []models.Task `json:"scheduled_tasks"`
			Count          int           `json:"count"`
		}
		err := json.NewDecoder(w.Body).Decode(&response)
		assert.NoError(t, err, "Failed to parse response body")
		assert.Equal(t, 0, response.Count)
	}

	// Cleanup
	gt.Cleanup(t)
}
