-- =============================================================================
-- Simulated College MIS Database Setup for XAMPP (college_db)
-- GCHealthLink Capstone Project
-- 
-- Instructions for XAMPP:
-- 1. Open phpMyAdmin at http://localhost/phpmyadmin
-- 2. Click the "SQL" tab (or Import tab)
-- 3. Paste and run this script. It will create `college_db` and insert students.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `college_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `college_db`;

DROP TABLE IF EXISTS `students`;

CREATE TABLE `students` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `student_number` VARCHAR(50) NOT NULL UNIQUE,
    `email` VARCHAR(191) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `middle_name` VARCHAR(100) NULL,
    `course` VARCHAR(150) NOT NULL,
    `course_dept` VARCHAR(50) NOT NULL,
    `year_level` VARCHAR(50) NOT NULL,
    `sex` VARCHAR(10) NULL,
    `birthday` DATE NULL,
    `status` VARCHAR(50) DEFAULT 'ENROLLED'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample Student Accounts (Default password for all accounts is: password)
-- Password Hash: $2y$10$Ya4WOYwQzA.tJ6UGLYTIVuuHK4hapramNl1MCK.eHKiQyCHqVojx.
INSERT INTO `students` (
    `student_number`, `email`, `password`, `first_name`, `last_name`, `middle_name`, `course`, `course_dept`, `year_level`, `sex`, `birthday`, `status`
) VALUES 
(
    '202110234',
    'student@gordoncollege.edu.ph',
    '$2y$10$Ya4WOYwQzA.tJ6UGLYTIVuuHK4hapramNl1MCK.eHKiQyCHqVojx.',
    'John',
    'Doe',
    'Alexander',
    'Bachelor of Science in Information Technology',
    'CCS',
    '3rd Year',
    'Male',
    '2003-05-14',
    'ENROLLED'
),
(
    '202210456',
    'maria.santos@gordoncollege.edu.ph',
    '$2y$10$Ya4WOYwQzA.tJ6UGLYTIVuuHK4hapramNl1MCK.eHKiQyCHqVojx.',
    'Maria',
    'Santos',
    'Cruz',
    'Bachelor of Science in Nursing',
    'CAHS',
    '2nd Year',
    'Female',
    '2004-09-22',
    'ENROLLED'
),
(
    '202010892',
    'juan.delacruz@gordoncollege.edu.ph',
    '$2y$10$Ya4WOYwQzA.tJ6UGLYTIVuuHK4hapramNl1MCK.eHKiQyCHqVojx.',
    'Juan',
    'Dela Cruz',
    'Bautista',
    'Bachelor of Science in Computer Science',
    'CCS',
    '4th Year',
    'Male',
    '2002-11-03',
    'ENROLLED'
),
(
    '202310119',
    'elena.roces@gordoncollege.edu.ph',
    '$2y$10$Ya4WOYwQzA.tJ6UGLYTIVuuHK4hapramNl1MCK.eHKiQyCHqVojx.',
    'Elena',
    'Roces',
    'Mendoza',
    'Bachelor of Science in Hospitality Management',
    'CHTM',
    '1st Year',
    'Female',
    '2005-02-18',
    'ENROLLED'
);
