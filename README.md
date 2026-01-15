# Usman Hardware Inventory Management System - Backend

This repository contains the backend for the Usman Hardware Inventory Management System, a robust and modular API built using Fastify and Node.js. It is designed to replace and enhance legacy PHP-based inventory systems with a modern, high-performance architecture.

## Overview

The system provides a comprehensive set of APIs for managing hardware store operations, including inventory tracking, sales processing, customer management, financial reporting, and audit logging.

## Key Modules

- **Dashboard**: High-level statistics, revenue trends, and performance metrics.
- **Inventory**: Product management, category organization, stock level tracking, and inventory reporting.
- **Sales & POS**: Sale creation, invoice generation, transaction history, and profit calculation.
- **Customers**: Comprehensive customer management including credit limits, balance tracking, and duplicate detection.
- **Suppliers**: Supplier information, contact management, and procurement tracking.
- **Purchase Orders**: Full lifecycle management of purchase orders, from creation to item reception.
- **Finance & Expenses**: Expense tracking, cash flow analysis, accounts payable/receivable, and financial statements.
- **Employee Management**: Staff records, roles, and administrative controls.
- **Audit Logs**: Detailed tracking of system activities for security and transparency.
- **Reports**: Specialized reporting for monthly sales, product performance, and customer insights.

## Architecture Highlights

- **Fastify Framework**: Utilizes Fastify for its industry-leading performance and low overhead.
- **Modular Structure**: Code is organized into feature-based modules (Controller-Service-Route-Schema) for maintainability and scalability.
- **MySQL Integration**: Direct integration with MySQL using `mysql2` and Connection Pooling for reliable data persistence.
- **Legacy Compatibility**: Includes a hybrid response system to support both modern wrapped JSON responses (`{ success, data }`) and legacy direct-format responses required by specialized frontend components.
- **Schema Validation**: Robust request and response validation using JSON Schema.

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Fastify
- **Language**: TypeScript
- **Database**: MySQL
- **Tooling**: Vite (for development), Tsx, ESLint
