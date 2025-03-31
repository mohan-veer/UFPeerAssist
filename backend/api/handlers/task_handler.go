package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"
	"ufpeerassist/backend/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// tasksCollection is the MongoDB collection for tasks
var tasksCollection *mongo.Collection

// InitTasksCollection initializes the tasks collection
func InitTasksCollection() {
	// Make sure this is called after InitMongoDB() in main.go
	if client != nil {
		db := client.Database("ufpeerassist")
		tasksCollection = db.Collection("tasks")

		// Create compound index on creator_email and status for faster querying
		indexModel := mongo.IndexModel{
			Keys: bson.D{
				{Key: "creator_email", Value: 1},
				{Key: "status", Value: 1},
			},
		}

		_, err := tasksCollection.Indexes().CreateOne(context.TODO(), indexModel)
		if err != nil {
			fmt.Println("Error creating task indexes:", err)
		}

		// Create index on work_type for category filtering
		workTypeIndex := mongo.IndexModel{
			Keys: bson.M{"work_type": 1},
		}

		_, err = tasksCollection.Indexes().CreateOne(context.TODO(), workTypeIndex)
		if err != nil {
			fmt.Println("Error creating work_type index:", err)
		}

		// Create index on task_date for date filtering
		dateIndex := mongo.IndexModel{
			Keys: bson.M{"task_date": 1},
		}

		_, err = tasksCollection.Indexes().CreateOne(context.TODO(), dateIndex)
		if err != nil {
			fmt.Println("Error creating task_date index:", err)
		}

		fmt.Println("✅ Tasks collection initialized with indexes!")
	}
}

// PostATask handles the creation or updating of a task by a user
func PostATask(c *gin.Context) {
	fmt.Print("Hey in the method")
	// Get email from URL parameter
	email := c.Param("email")

	// Check if user exists
	var user models.Users
	err := usersCollection.FindOne(context.TODO(), bson.M{"email": email}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	fmt.Print("Hey in the method 11 ")
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
	fmt.Print("Hey in the method 22")
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
	fmt.Print("Hey in the method 33")
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
		err = tasksCollection.FindOne(
			context.TODO(),
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

		result, err := tasksCollection.UpdateOne(
			context.TODO(),
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
		fmt.Print("Hey in the method 55")
		// Create a new task
		newTask := models.Task{
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
		fmt.Print("Hey in the method 66")
		// Insert the task
		result, err := tasksCollection.InsertOne(context.TODO(), newTask)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task", "details": err.Error()})
			return
		}

		// Convert the InsertedID to a string
		insertedID := result.InsertedID.(primitive.ObjectID).Hex()
		fmt.Print("Hey in the method 77")
		c.JSON(http.StatusCreated, gin.H{
			"message": "Task created successfully",
			"task_id": insertedID,
		})
	}
}

/*
GetAllTasksForUser : returns all the available tasks for a logged in user
Excludes tasks created by the viewer and tasks the viewer has already applied for
*/
func GetAllTasksForUser(c *gin.Context) {
	// Get viewer's email from URL parameter
	viewerEmail := c.Param("viewer_email")

	// Verify that viewer exists (authentication check)
	var viewer models.Users
	err := usersCollection.FindOne(context.TODO(), bson.M{"email": viewerEmail}).Decode(&viewer)
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
	cursor, err := tasksCollection.Find(context.TODO(), filter, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve tasks", "details": err.Error()})
		return
	}
	defer cursor.Close(context.TODO())

	// Decode results
	var tasks []models.Task
	if err := cursor.All(context.TODO(), &tasks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode tasks", "details": err.Error()})
		return
	}

	// Increment view count for each task (do this in background to not slow down response)
	go func() {
		ctx := context.Background()
		for _, task := range tasks {
			_, _ = tasksCollection.UpdateOne(
				ctx,
				bson.M{"_id": task.ID},
				bson.M{"$inc": bson.M{"views": 1}},
			)
		}
	}()

	// Return all tasks without pagination
	c.JSON(http.StatusOK, gin.H{
		"tasks": tasks,
		"count": len(tasks),
	})
}

// ApplyForTask allows a user to apply for a task
func ApplyForTask(c *gin.Context) {
	// Get task ID from URL parameter
	taskID := c.Param("task_id")

	// Get applicant's email from URL parameter
	applicantEmail := c.Param("email")

	// Verify that applicant exists
	var applicant models.Users
	err := usersCollection.FindOne(context.TODO(), bson.M{"email": applicantEmail}).Decode(&applicant)
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
	err = tasksCollection.FindOne(
		context.TODO(),
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

	_, err = tasksCollection.UpdateOne(
		context.TODO(),
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

/* GetAppliedTasks: returns all tasks that a user has applied for
 */
func GetAppliedTasks(c *gin.Context) {
	// Get viewer's email from URL parameter
	viewerEmail := c.Param("viewer_email")

	// Verify that viewer exists (authentication check)
	var viewer models.Users
	err := usersCollection.FindOne(context.TODO(), bson.M{"email": viewerEmail}).Decode(&viewer)
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
	cursor, err := tasksCollection.Find(context.TODO(), filter, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve applied tasks", "details": err.Error()})
		return
	}
	defer cursor.Close(context.TODO())

	// Decode results
	var appliedTasks []models.Task
	if err := cursor.All(context.TODO(), &appliedTasks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode tasks", "details": err.Error()})
		return
	}

	// Get task creators info to include with each task
	var tasksWithCreatorInfo []gin.H
	for _, task := range appliedTasks {
		var creator models.Users
		err := usersCollection.FindOne(
			context.TODO(),
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
