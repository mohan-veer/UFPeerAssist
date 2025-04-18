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
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// MongoDB client and collections
var client *mongo.Client
var usersCollection *mongo.Collection
var authCollection *mongo.Collection
var otpCollection *mongo.Collection
var passwordResetReason = "passwordreset"

// Initialize MongoDB connection
func InitMongoDB() {
	// generic uri
	//uri := "mongodb://localhost:27017"
	// replication set uri
	uri := "mongodb://localhost:27017/ufpeerassist?replicaSet=rs0"

	// Connect to MongoDB
	var err error
	client, err = mongo.Connect(context.TODO(), options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal("❌ Failed to connect to MongoDB:", err)
	}

	// Select database and collections
	db := client.Database("ufpeerassist")
	usersCollection = db.Collection("users")
	authCollection = db.Collection("auth")
	otpCollection = db.Collection("otp") // Add OTP collection

	// ✅ Create TTL index on "expires_at"
	indexModel := mongo.IndexModel{
		Keys:    bson.M{"expires_at": 1},                  // Index on expires_at field
		Options: options.Index().SetExpireAfterSeconds(0), // TTL index (expire immediately when time is reached)
	}

	_, err = otpCollection.Indexes().CreateOne(context.TODO(), indexModel)
	if err != nil {
		log.Fatal("❌ Failed to create TTL index:", err)
	}

	fmt.Println("✅ MongoDB connected, TTL index for OTP set!")
}

// Signup Handler with Transaction Support
func Signup(c *gin.Context) {
	var input struct {
		Name     string `json:"name" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Mobile   string `json:"mobile" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user already exists
	var existingUser models.Users
	err := usersCollection.FindOne(context.TODO(), bson.M{"email": input.Email}).Decode(&existingUser)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}

	// Hash the password
	hashedPassword, err := utils.HashPassword(input.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Start MongoDB Transaction
	session, err := client.StartSession()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer session.EndSession(context.TODO())

	// Transaction Function
	callback := func(sessCtx mongo.SessionContext) (interface{}, error) {
		// Insert user
		_, err := usersCollection.InsertOne(sessCtx, models.Users{
			Email:          input.Email,
			Name:           input.Name,
			Mobile:         input.Mobile,
			CompletedTasks: 0,
			Rating:         "",
		})
		if err != nil {
			return nil, err
		}

		// Insert authentication data
		_, err = authCollection.InsertOne(sessCtx, models.User_Auth{
			Email:    input.Email,
			Password: hashedPassword,
		})
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

	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully!"})
}

// Login Handler
func Login(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var auth models.User_Auth
	err := authCollection.FindOne(context.TODO(), bson.M{"email": input.Email}).Decode(&auth)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Verify password
	if !utils.CheckPassword(auth.Password, input.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Create JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"email": input.Email,
		"exp":   time.Now().Add(time.Hour * 24).Unix(), // Token expires in 24 hours
	})

	// Sign the token with a secret key
	secretKey := "your-secret-key-here" // In production, use environment variables
	tokenString, err := token.SignedString([]byte(secretKey))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful!",
		"token":   tokenString,
	})
}

// Request Password Reset - Generates OTP
func GenerateOTPForResetPassword(c *gin.Context) {
	var request struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Check if the user exists
	var user models.Users
	err := usersCollection.FindOne(context.TODO(), bson.M{"email": request.Email}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Generate a new OTP
	otp := utils.GenerateOTP()
	expirationTime := time.Now().Add(10 * time.Minute) // OTP valid for 10 minutes

	// ✅ Insert OTP with expiration time (MongoDB will auto-delete)
	_, err = otpCollection.UpdateOne(
		context.TODO(),
		bson.M{"email": request.Email},
		bson.M{"$set": bson.M{"code": otp, "expires_at": expirationTime}},
		options.Update().SetUpsert(true),
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate OTP"})
		return
	}

	// Send OTP via email (implement `utils.SendOTP`)
	if err := utils.SendOTP(passwordResetReason, request.Email, otp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send OTP"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "OTP sent to your email"})
}

// Validate OTP and Update Password
func ValidateOtpAndUpdatePassword(c *gin.Context) {
	var request struct {
		Email    string `json:"email" binding:"required,email"`
		OTP      string `json:"otp" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Check if OTP exists (MongoDB TTL will auto-delete expired OTPs)
	var storedOTP models.OTP
	err := otpCollection.FindOne(context.TODO(), bson.M{"email": request.Email, "code": request.OTP}).Decode(&storedOTP)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired OTP"})
		return
	}

	// Hash the new password before storing it
	hashedPassword, err := utils.HashPassword(request.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Start MongoDB transaction for password update
	session, err := client.StartSession()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer session.EndSession(context.TODO())

	// Transaction Function
	callback := func(sessCtx mongo.SessionContext) (interface{}, error) {
		// ✅ Update password in auth collection
		_, err = authCollection.UpdateOne(sessCtx,
			bson.M{"email": request.Email},
			bson.M{"$set": bson.M{"password": hashedPassword}},
		)
		if err != nil {
			return nil, err
		}

		// ✅ Delete OTP after successful password reset
		_, err = otpCollection.DeleteOne(sessCtx, bson.M{"email": request.Email})
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

	c.JSON(http.StatusOK, gin.H{"message": "OTP verified. Password updated successfully!"})
}

func UpdateUserProfile(c *gin.Context) {
	// Get email from URL parameter
	email := c.Param("email")

	// Define input structure for profile update
	var input struct {
		Name   string `json:"name" binding:"omitempty"`
		Mobile string `json:"mobile" binding:"omitempty"`
		// next sprint - to add other fields related to user
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Prepare update document with only provided fields
	updateDoc := bson.M{}

	if input.Name != "" {
		updateDoc["name"] = input.Name
	}

	if input.Mobile != "" {
		updateDoc["mobile"] = input.Mobile
	}

	// If no fields were provided to update
	if len(updateDoc) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields provided for update"})
		return
	}

	// Update the user profile
	result, err := usersCollection.UpdateOne(
		context.TODO(),
		bson.M{"email": email},
		bson.M{"$set": updateDoc},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile", "details": err.Error()})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"updated": result.ModifiedCount > 0,
	})

}

func GetUserProfile(c *gin.Context) {

	// Get email from URL parameter
	email := c.Param("email")

	// Define a struct to hold the user data
	type UserProfile struct {
		Email  string `json:"email" bson:"email"`
		Name   string `json:"name" bson:"name"`
		Mobile string `json:"mobile" bson:"mobile"`
		Rating string `json:"rating" bson:"rating"`
		// Add any other fields you want to include
	}

	var profile UserProfile

	// Find the user by email
	err := usersCollection.FindOne(
		context.TODO(),
		bson.M{"email": email},
	).Decode(&profile)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve profile", "details": err.Error()})
		return
	}

	// Return the user profile
	c.JSON(http.StatusOK, profile)

}

// GetUserCreatedTasks returns all tasks created by a specific user
func GetUserCreatedTasks(c *gin.Context) {
	// Get user email from URL parameter
	userEmail := c.Param("email")

	// Verify that user exists
	var user models.Users
	err := usersCollection.FindOne(context.TODO(), bson.M{"email": userEmail}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required. User not found."})
		return
	}

	// Build filter to find tasks created by this user
	filter := bson.M{
		"creator_email": userEmail,
	}

	// Define options for sorting - newest first
	findOptions := options.Find().
		SetSort(bson.M{"created_at": -1}) // Sort by newest first (descending order)

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

	// Ensure tasks is never null
	if tasks == nil {
		tasks = []models.Task{}
	}

	// Return all tasks created by the user
	c.JSON(http.StatusOK, gin.H{
		"tasks": tasks,
		"count": len(tasks),
	})
}
