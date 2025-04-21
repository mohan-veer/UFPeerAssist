import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import UserProfile from "./components/UserProfile";
import PostTask from "./components/PostTask";
import MyTasks from "./components/MyTasks";
import ScheduledTasks from "./components/ScheduledTasks"; // Import new component
import AppliedTasks from "./components/AppliedTasks"; // Import new component
import TaskApplications from "./components/TaskApplications"; // Import new component
import TaskVerification from "./components/TaskVerification"; // Import new component
import CompletedTasks from "./components/CompletedTasks"; // Import new component
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import TestimonialsSection from "./components/TestimonialsSection";
import HowItWorksSection from "./components/HowItWorksSection";
import CallToActionSection from "./components/CallToActionSection";
import Footer from "./components/Footer";
import ResetPassword from "./components/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

const Home = () => {
  return (
    <div>
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <HowItWorksSection />
      <CallToActionSection />
      <Footer />
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset" element={<ResetPassword />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:email"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/post-task"
          element={
            <ProtectedRoute>
              <PostTask />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-tasks"
          element={
            <ProtectedRoute>
              <MyTasks />
            </ProtectedRoute>
          }
        />
        {/* New Routes */}
        <Route
          path="/scheduled-tasks"
          element={
            <ProtectedRoute>
              <ScheduledTasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/applied-tasks"
          element={
            <ProtectedRoute>
              <AppliedTasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/task-applications"
          element={
            <ProtectedRoute>
              <TaskApplications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/task-verification"
          element={
            <ProtectedRoute>
              <TaskVerification />
            </ProtectedRoute>
          }
        />
        <Route
          path="/completed-tasks"
          element={
            <ProtectedRoute>
              <CompletedTasks />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;