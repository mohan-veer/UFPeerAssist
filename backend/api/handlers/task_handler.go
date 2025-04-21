package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"
	"ufpeerassist/backend/api/utils"
	"ufpeerassist/backend/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// tasksCollection is the MongoDB collection for tasks
var tasksCollection *mongo.Collection
var scheduledTasksCollection *mongo.Collection

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

func InitScheduledTasksCollection() {
	if client != nil {
		db := client.Database("ufpeerassist")
		scheduledTasksCollection = db.Collection("scheduled_tasks")
		fmt.Println("Scheduled tasks collection initialized!")
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
	fmt.Printf("Fetching tasks for user: %s\n", viewerEmail)

	// Verify that viewer exists (authentication check)
	var viewer models.Users
	err := usersCollection.FindOne(context.TODO(), bson.M{"email": viewerEmail}).Decode(&viewer)
	if err != nil {
		fmt.Printf("User not found: %s, error: %v\n", viewerEmail, err)
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
		fmt.Printf("Filtering by category: %s\n", category)
	}

	// Filter by date range if provided
	if fromDate := c.Query("from_date"); fromDate != "" {
		parsedFromDate, err := time.Parse("2006-01-02", fromDate)
		if err == nil {
			if filter["task_date"] == nil {
				filter["task_date"] = bson.M{}
			}
			filter["task_date"].(bson.M)["$gte"] = parsedFromDate
			fmt.Printf("Filtering from date: %s\n", fromDate)
		} else {
			fmt.Printf("Invalid from_date format: %s\n", fromDate)
		}
	}

	if toDate := c.Query("to_date"); toDate != "" {
		parsedToDate, err := time.Parse("2006-01-02", toDate)
		if err == nil {
			if filter["task_date"] == nil {
				filter["task_date"] = bson.M{}
			}
			filter["task_date"].(bson.M)["$lte"] = parsedToDate
			fmt.Printf("Filtering to date: %s\n", toDate)
		} else {
			fmt.Printf("Invalid to_date format: %s\n", toDate)
		}
	}

	fmt.Printf("Query filter: %+v\n", filter)

	// Define options for sorting - oldest first
	findOptions := options.Find().
		SetSort(bson.M{"created_at": 1}) // Sort by oldest first (ascending order)

	// Execute the query
	cursor, err := tasksCollection.Find(context.TODO(), filter, findOptions)
	if err != nil {
		fmt.Printf("Error retrieving tasks: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve tasks", "details": err.Error()})
		return
	}
	defer cursor.Close(context.TODO())

	// Decode results
	var tasks []models.Task
	if err := cursor.All(context.TODO(), &tasks); err != nil {
		fmt.Printf("Error decoding tasks: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode tasks", "details": err.Error()})
		return
	}

	// Ensure tasks is never null, use empty array instead
	if tasks == nil {
		tasks = []models.Task{}
	}

	fmt.Printf("Found %d tasks for user %s\n", len(tasks), viewerEmail)

	// Increment view count for each task (do this in background to not slow down response)
	go func() {
		ctx := context.Background()
		for _, task := range tasks {
			_, err := tasksCollection.UpdateOne(
				ctx,
				bson.M{"_id": task.ID},
				bson.M{"$inc": bson.M{"views": 1}},
			)
			if err != nil {
				fmt.Printf("Error incrementing view count for task %s: %v\n", task.ID, err)
			}
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

//-------------------------------------------

// ApplyForTask allows a user to apply for a task
func AcceptTask(c *gin.Context) {
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

	// Add user to selected list
	update := bson.M{
		"$push": bson.M{"selected_users": applicantEmail},
	}

	_, err = tasksCollection.UpdateOne(
		context.TODO(),
		bson.M{"_id": objectID},
		update,
	)
	// to-do: add task to scheduled tasks.

	if err := addTaskToScheduledTasks(task, applicantEmail); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to schedule task"})
		return
	}

	// Send email notification

	go func() {
		if err := utils.SendEmailNotification(applicantEmail, task.Title); err != nil {
			log.Printf("Failed to send email to %s: %v\n", applicantEmail, err)
		} else {
			log.Printf("Email sent successfully to %s\n", applicantEmail)
		}
	}()

	// to-do: send email notification to applicant that poster accepted him

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to acept a task", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Successfully accepted the task",
	})
}

func addTaskToScheduledTasks(task models.Task, workerEmail string) error {
	entry := models.ScheduledTask{
		TaskID:      task.ID,
		Title:       task.Title,
		Poster:      task.CreatorEmail,
		Worker:      workerEmail,
		ScheduledAt: time.Now(),
		TaskDate:    task.TaskDate,
		TaskTime:    task.TaskTime,
		Place:       task.PlaceOfWork,
	}
	_, err := scheduledTasksCollection.InsertOne(context.TODO(), entry)
	return err
}

func GetScheduledTasks(c *gin.Context) {
	email := c.Param("email")

	//  Verify user exists
	var user models.Users
	err := usersCollection.FindOne(context.TODO(), bson.M{"email": email}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Find all scheduled tasks where user is a worker
	filter := bson.M{"worker_email": email}
	cursor, err := scheduledTasksCollection.Find(context.TODO(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query scheduled_tasks"})
		return
	}
	defer cursor.Close(context.TODO())

	var scheduledTasks []models.ScheduledTask
	if err := cursor.All(context.TODO(), &scheduledTasks); err != nil {
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
	taskCursor, err := tasksCollection.Find(context.TODO(), taskFilter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch full task details"})
		return
	}
	defer taskCursor.Close(context.TODO())

	var tasks []models.Task
	if err := taskCursor.All(context.TODO(), &tasks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode tasks"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"scheduled_tasks": tasks,
		"count":           len(tasks),
	})
}

func EndTask(c *gin.Context) {
	// Get task ID and worker email from URL parameters
	taskID := c.Param("task_id")
	workerEmail := c.Param("email")

	// Convert string ID to MongoDB ObjectID
	objectID, err := primitive.ObjectIDFromHex(taskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID format"})
		return
	}

	// Find the task in the database
	var task models.Task
	err = tasksCollection.FindOne(
		context.TODO(),
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
	otp := utils.GenerateOTP()
	expirationTime := time.Now().Add(30 * time.Minute) // OTP valid for 30 minutes

	// Store OTP with task context in the database
	_, err = otpCollection.UpdateOne(
		context.TODO(),
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

	// Send OTP to task owner asynchronously
	go func() {
		if err := utils.SendTaskCompletionOTP(task.CreatorEmail, otp, task.Title); err != nil {
			log.Printf("Failed to send OTP to %s: %v\n", task.CreatorEmail, err)
		} else {
			log.Printf("Task completion OTP sent successfully to %s\n", task.CreatorEmail)
		}
	}()

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"message":    "Task completion OTP sent to the task owner",
		"task_title": task.Title,
		"task_owner": task.CreatorEmail,
	})
}

func ValidateTaskCompletionOTP(c *gin.Context) {
	// JSON request structure
	var request struct {
		TaskID string `json:"task_id" binding:"required"`
		Email  string `json:"email" binding:"required,email"` // Task owner's email
		OTP    string `json:"otp" binding:"required"`
	}

	// Validate request format
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Convert string ID to MongoDB ObjectID
	objectID, err := primitive.ObjectIDFromHex(request.TaskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID format"})
		return
	}

	// Check if OTP exists and is valid
	var storedOTP models.TaskCompletionOTP
	err = otpCollection.FindOne(
		context.TODO(),
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

	// Start MongoDB transaction for atomic updates
	session, err := client.StartSession()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer session.EndSession(context.TODO())

	// Transaction Function - all operations succeed or fail together
	callback := func(sessCtx mongo.SessionContext) (interface{}, error) {
		// Update task status to Completed
		_, err = tasksCollection.UpdateOne(
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
		_, err = scheduledTasksCollection.UpdateOne(
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
		_, err = usersCollection.UpdateOne(
			sessCtx,
			bson.M{"email": storedOTP.WorkerEmail},
			bson.M{"$inc": bson.M{"completed_tasks": 1}},
		)
		if err != nil {
			return nil, err
		}

		// Delete OTP after successful validation
		_, err = otpCollection.DeleteOne(
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
	_, err = session.WithTransaction(context.TODO(), callback)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed", "details": err.Error()})
		return
	}

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"message": "Task completed successfully!",
		"task_id": request.TaskID,
	})
}
