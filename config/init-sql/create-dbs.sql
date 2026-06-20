-- Nova ID Database Initialization Script
-- PostgreSQL 15
-- Creates three distinct databases for Ory Stack components

-- Create kratos database
CREATE DATABASE kratos;

-- Create hydra database
CREATE DATABASE hydra;

-- Create keto database
CREATE DATABASE keto;

-- Create nova_audit database (append-only audit trail for the BFF)
CREATE DATABASE nova_audit;

-- Create demo_app database (demo application's own persistence — decoupled from IdP)
CREATE DATABASE demo_app;
