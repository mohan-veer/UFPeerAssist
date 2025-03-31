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

// GetAppliedTasksTest encapsulates all test dependencies
type GetAppliedTasksTest struct {
	client    *mongo.Client
	db        *mongo.Database
	router    *gin.Engine
	taskIDs   []primitive.ObjectID
	ctx       context.Context
	cancelCtx context.CancelFunc
}

// Initialize sets up the test environment
func (gat *GetAppliedTasksTest) Initialize(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a context with timeout
	gat.ctx, gat.cancelCtx = context.WithTimeout(context.Background(), 30*time.Second)

	// Connect to MongoDB
	var err error
	gat.client, err = mongo.Connect(gat.ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Use a test database with a unique name to avoid conflicts
	gat.db = gat.client.Database("ufpeerassist_test_get_applied_tasks")

	// Clear existing data from collections
	gat.db.Collection("users").DeleteMany(gat.ctx, bson.M{})
	gat.db.Collection("tasks").DeleteMany(gat.ctx, bson.M{})

	// Seed test data
	gat.seedTestData(t)

	// Initialize router with mock handler
	gat.router = gin.Default()
	gat.router.GET("/tasks/applied/:viewer_email", gat.mockGetAppliedTasks)
}

// Cleanup tears down the test environment
func (gat *GetAppliedTasksTest) Cleanup(t *testing.T) {
	// Drop the test database
	err := gat.db.Drop(gat.ctx)
	if err != nil {
		t.Logf("Warning: Failed to drop test database: %v", err)
	}

	// Disconnect from MongoDB
	err = gat.client.Disconnect(gat.ctx)
	if err != nil {
		t.Logf("Warning: Failed to disconnect from MongoDB: %v", err)
	}

	// Cancel the context
	gat.cancelCtx()
}

// Mock GetAppliedTasks handler
func (gat *GetAppliedTasksTest) mockGetAppliedTasks(c *gin.Context) {
	// Get viewer's email from URL parameter
	viewerEmail := c.Param("viewer_email")

	// Verify that viewer exists (authentication check)
	var viewer models.Users
	err := gat.db.Collection("users").FindOne(gat.ctx, bson.M{"email": viewerEmail}).Decode(&viewer)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required. User not found."})
		return
	}

	// Build filter to find tasks where the user is in applicants array
	filter := bson.M{
		"applicants": viewerEmail, // Find all tasks where this user has applied
	}

	// Define options for sorting - oldest first
	findOptions := options.Find().
		SetSort(bson.M{"created_at": 1}) // Sort by oldest first (ascending order)

	// Execute the query
	cursor, err := gat.db.Collection("tasks").Find(gat.ctx, filter, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve applied tasks", "details": err.Error()})
		return
	}
	defer cursor.Close(gat.ctx)

	// Decode results
	var appliedTasks []models.Task
	if err := cursor.All(gat.ctx, &appliedTasks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode tasks", "details": err.Error()})
		return
	}

	// Get task creators info to include with each task
	var tasksWithCreatorInfo []gin.H
	for _, task := range appliedTasks {
		var creator models.Users
		err := gat.db.Collection("users").FindOne(
			gat.ctx,
			bson.M{"email": task.CreatorEmail},
		).Decode(&creator)

		// Include creator info even if we couldn't find it
		creatorInfo := gin.H{
			"name":   "",
			"email":  task.CreatorEmail,
			"mobile": "",
		}

		if err == nil {
			creatorInfo["name"] = creator.Name
			creatorInfo["mobile"] = creator.Mobile
		}

		// Create a sanitized task object without other applicants' information
		// Only include information that the applicant should see
		sanitizedTask := gin.H{
			"id":                 task.ID,
			"title":              task.Title,
			"description":        task.Description,
			"task_time":          task.TaskTime,
			"task_date":          task.TaskDate,
			"estimated_pay_rate": task.EstimatedPayRate,
			"place_of_work":      task.PlaceOfWork,
			"work_type":          task.WorkType,
			"people_needed":      task.PeopleNeeded,
			"creator_email":      task.CreatorEmail,
			"created_at":         task.CreatedAt,
			"updated_at":         task.UpdatedAt,
			"status":             task.Status,
			"views":              task.Views,
			"total_applicants":   len(task.Applicants), // Just show the count, not the actual applicants
			"has_applied":        true,                 // The user has definitely applied since this is their applied tasks list
		}

		// Add task with creator info
		tasksWithCreatorInfo = append(tasksWithCreatorInfo, gin.H{
			"task":    sanitizedTask,
			"creator": creatorInfo,
			// Include status information for the application
			"selected": contains(task.SelectedUsers, viewerEmail),
		})
	}

	// Return applied tasks
	c.JSON(http.StatusOK, gin.H{
		"applied_tasks": tasksWithCreatorInfo,
		"count":         len(appliedTasks),
	})
}

// Helper function to check if a string is in a slice
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// Seed the test database with initial data
func (gat *GetAppliedTasksTest) seedTestData(t *testing.T) {
	// Insert test users
	_, err := gat.db.Collection("users").InsertMany(gat.ctx, []interface{}{
		models.Users{
			Name:   "Applicant User",
			Email:  "applicant@example.com",
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
			Name:   "No Applications User",
			Email:  "noapps@example.com",
			Mobile: "8885551234",
		},
	})
	if err != nil {
		t.Fatalf("Failed to seed test users: %v", err)
	}

	// Create some test tasks with different creators, dates, and categories
	now := time.Now()
	gat.taskIDs = make([]primitive.ObjectID, 5)

	// Task dates
	date1, _ := time.Parse("2006-01-02", "2025-04-10")
	date2, _ := time.Parse("2006-01-02", "2025-04-15")
	date3, _ := time.Parse("2006-01-02", "2025-04-20")
	date4, _ := time.Parse("2006-01-02", "2025-04-25")
	date5, _ := time.Parse("2006-01-02", "2025-04-30")

	// Create tasks with different attributes and application statuses
	tasks := []interface{}{
		models.Task{
			ID:               primitive.NewObjectID(),
			Title:            "Applied Open Task",
			Description:      "This is a task the user has applied for that is still open",
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
			Applicants:       []string{"applicant@example.com"}, // User has applied
			SelectedUsers:    []string{},                        // But not selected
		},
		models.Task{
			ID:               primitive.NewObjectID(),
			Title:            "Applied and Selected Task",
			Description:      "This is a task the user has applied for and has been selected",
			TaskTime:         "14:00",
			TaskDate:         date2,
			EstimatedPayRate: 20.00,
			PlaceOfWork:      "House",
			WorkType:         models.Cleaning,
			PeopleNeeded:     2,
			CreatorEmail:     "another@example.com",
			CreatedAt:        now.Add(-36 * time.Hour),
			UpdatedAt:        now.Add(-36 * time.Hour),
			Status:           models.InProgress,
			Views:            3,
			Applicants:       []string{"applicant@example.com"}, // User has applied
			SelectedUsers:    []string{"applicant@example.com"}, // And was selected
		},
		models.Task{
			ID:               primitive.NewObjectID(),
			Title:            "Completed Applied Task",
			Description:      "This is a completed task the user applied for",
			TaskTime:         "16:00",
			TaskDate:         date3,
			EstimatedPayRate: 30.00,
			PlaceOfWork:      "Library",
			WorkType:         models.Tutoring,
			PeopleNeeded:     1,
			CreatorEmail:     "creator@example.com",
			CreatedAt:        now.Add(-24 * time.Hour),
			UpdatedAt:        now.Add(-24 * time.Hour),
			Status:           models.Completed,
			Views:            8,
			Applicants:       []string{"applicant@example.com"}, // User has applied
			SelectedUsers:    []string{"applicant@example.com"}, // And was selected
		},
		models.Task{
			ID:               primitive.NewObjectID(),
			Title:            "Cancelled Applied Task",
			Description:      "This is a cancelled task the user applied for",
			TaskTime:         "09:00",
			TaskDate:         date4,
			EstimatedPayRate: 35.00,
			PlaceOfWork:      "House",
			WorkType:         models.Painting,
			PeopleNeeded:     2,
			CreatorEmail:     "another@example.com",
			CreatedAt:        now.Add(-12 * time.Hour),
			UpdatedAt:        now.Add(-12 * time.Hour),
			Status:           models.Cancelled,
			Views:            2,
			Applicants:       []string{"applicant@example.com"}, // User has applied
			SelectedUsers:    []string{},                        // But not selected
		},
		models.Task{
			ID:               primitive.NewObjectID(),
			Title:            "Task Not Applied For",
			Description:      "This is a task the user has not applied for",
			TaskTime:         "08:00",
			TaskDate:         date5,
			EstimatedPayRate: 25.00,
			PlaceOfWork:      "House",
			WorkType:         models.Gardening,
			PeopleNeeded:     1,
			CreatorEmail:     "creator@example.com",
			CreatedAt:        now.Add(-6 * time.Hour),
			UpdatedAt:        now.Add(-6 * time.Hour),
			Status:           models.Open,
			Views:            0,
			Applicants:       []string{}, // User has not applied
			SelectedUsers:    []string{},
		},
	}

	// Insert all tasks and keep their IDs
	insertResult, err := gat.db.Collection("tasks").InsertMany(gat.ctx, tasks)
	if err != nil {
		t.Fatalf("Failed to seed test tasks: %v", err)
	}

	// Store the IDs for later reference
	for i, id := range insertResult.InsertedIDs {
		gat.taskIDs[i] = id.(primitive.ObjectID)
	}
}

// Test retrieving all tasks a user has applied for
func TestGetAppliedTasks(t *testing.T) {
	// Initialize test environment
	gat := &GetAppliedTasksTest{}
	gat.Initialize(t)
	defer gat.Cleanup(t)

	// Create a request to get all tasks the user has applied for
	req, _ := http.NewRequest("GET", "/tasks/applied/applicant@example.com", nil)

	w := httptest.NewRecorder()
	gat.router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK for getting applied tasks")

	// Parse the response
	var response struct {
		AppliedTasks []map[string]interface{} `json:"applied_tasks"`
		Count        int                      `json:"count"`
	}

	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")

	// Verify the number of tasks
	assert.Equal(t, 4, response.Count, "Expected 4 tasks that the user has applied for")

	// Check that each task has the expected structure
	for _, taskInfo := range response.AppliedTasks {
		// Check that the task object exists
		task, taskExists := taskInfo["task"].(map[string]interface{})
		assert.True(t, taskExists, "Task object should exist in response")

		// Check that creator info exists
		creator, creatorExists := taskInfo["creator"].(map[string]interface{})
		assert.True(t, creatorExists, "Creator info should exist in response")

		// Check task fields
		assert.NotEmpty(t, task["id"], "Task ID should not be empty")
		assert.NotEmpty(t, task["title"], "Task title should not be empty")
		assert.NotEmpty(t, task["description"], "Task description should not be empty")
		assert.NotEmpty(t, task["task_time"], "Task time should not be empty")

		// Task date is a JSON date, so it will exist but specific format check isn't needed here

		// Check creator fields
		assert.NotEmpty(t, creator["email"], "Creator email should not be empty")

		// Check has_applied is true for all tasks (since these are applied tasks)
		hasApplied, hasAppliedExists := task["has_applied"].(bool)
		assert.True(t, hasAppliedExists, "has_applied field should exist")
		assert.True(t, hasApplied, "has_applied should be true for applied tasks")

		// Check that selected status is included
		_, selectedExists := taskInfo["selected"].(bool)
		assert.True(t, selectedExists, "Selected status should exist in response")
	}
}

// Test retrieving applied tasks for a user with no applications
func TestGetAppliedTasksNoApplications(t *testing.T) {
	// Initialize test environment
	gat := &GetAppliedTasksTest{}
	gat.Initialize(t)
	defer gat.Cleanup(t)

	// Create a request for a user with no applications
	req, _ := http.NewRequest("GET", "/tasks/applied/noapps@example.com", nil)

	w := httptest.NewRecorder()
	gat.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK even when user has no applications")

	// Parse the response
	var response struct {
		AppliedTasks []map[string]interface{} `json:"applied_tasks"`
		Count        int                      `json:"count"`
	}

	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")

	// Verify empty result
	assert.Equal(t, 0, response.Count, "Expected 0 tasks for user with no applications")
	assert.Empty(t, response.AppliedTasks, "Applied tasks list should be empty")
}

// Test retrieving applied tasks for a non-existent user
func TestGetAppliedTasksNonExistentUser(t *testing.T) {
	// Initialize test environment
	gat := &GetAppliedTasksTest{}
	gat.Initialize(t)
	defer gat.Cleanup(t)

	// Create a request with a non-existent user
	req, _ := http.NewRequest("GET", "/tasks/applied/nonexistent@example.com", nil)

	w := httptest.NewRecorder()
	gat.router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusUnauthorized, w.Code, "Expected status 401 Unauthorized for non-existent user")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Authentication required. User not found.", response.Error)
}

// Test that selected status is correctly reported for tasks
func TestGetAppliedTasksSelectedStatus(t *testing.T) {
	// Initialize test environment
	gat := &GetAppliedTasksTest{}
	gat.Initialize(t)
	defer gat.Cleanup(t)

	// Create a request to get all tasks the user has applied for
	req, _ := http.NewRequest("GET", "/tasks/applied/applicant@example.com", nil)

	w := httptest.NewRecorder()
	gat.router.ServeHTTP(w, req)

	// Parse the response
	var response struct {
		AppliedTasks []map[string]interface{} `json:"applied_tasks"`
		Count        int                      `json:"count"`
	}

	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")

	// Verify that some tasks have selected=true and some have selected=false
	selectedFound := false
	notSelectedFound := false

	for _, taskInfo := range response.AppliedTasks {
		selected := taskInfo["selected"].(bool)

		if selected {
			selectedFound = true
		} else {
			notSelectedFound = true
		}

		// Check if task title matches expected selection status
		task := taskInfo["task"].(map[string]interface{})
		title := task["title"].(string)

		if title == "Applied and Selected Task" || title == "Completed Applied Task" {
			assert.True(t, selected, "User should be marked as selected for '%s'", title)
		} else {
			assert.False(t, selected, "User should not be marked as selected for '%s'", title)
		}
	}

	assert.True(t, selectedFound, "At least one task should have user selected")
	assert.True(t, notSelectedFound, "At least one task should have user not selected")
}
