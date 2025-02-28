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
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// MongoDB client and collections
var client *mongo.Client
var usersCollection *mongo.Collection
var authCollection *mongo.Collection
var otpCollection *mongo.Collection

// Initialize MongoDB connection
func InitMongoDB() {
	uri := "mongodb://localhost:27017"

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
			Email:  input.Email,
			Name:   input.Name,
			Mobile: input.Mobile,
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or signup before login"})
		return
	}

	// Verify password
	if !utils.CheckPassword(auth.Password, input.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Login successful!"})
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
	if err := utils.SendOTP(request.Email, otp); err != nil {
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
