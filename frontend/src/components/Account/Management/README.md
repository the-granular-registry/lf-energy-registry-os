# Account Management Component

## Overview

The Account Management component provides a comprehensive interface for managing accounts and sub-accounts in the Granular Certificate Registry system. It allows users to create new accounts, create sub-accounts under existing accounts, and manage the hierarchical structure of accounts.

## Features

### 1. Account Hierarchy Tree View
- **Visual Tree Structure**: Displays accounts and sub-accounts in a hierarchical tree view
- **Account Types**: Supports different account types (Production, Trading, Audit)
- **Status Indicators**: Shows active/inactive status for each account
- **Expandable/Collapsible**: Users can expand or collapse account branches

### 2. Account Creation
- **Create Main Accounts**: Add new top-level accounts
- **Create Sub-Accounts**: Add sub-accounts under existing accounts
- **Account Type Selection**: Choose from Production, Trading, or Audit account types
- **Account Description**: Optional description field for additional details

### 3. User Profile Management
- **Personal Information**: Edit name, email, and role
- **Profile Photo**: Upload and manage profile pictures
- **Role Management**: View and update user roles

## Usage

### Creating a New Account
1. Click the "Create Account" button in the Account Hierarchy card
2. Fill in the account name and select the account type
3. Optionally add a description
4. Click "Create Account" to save

### Creating a Sub-Account
1. Click the "+" button next to any existing account in the tree
2. The modal will show the parent account name
3. Fill in the sub-account details
4. Click "Create Sub-Account" to save

### Managing User Profile
1. Use the form in the User Profile card on the right side
2. Update personal information as needed
3. Upload a new profile photo if desired
4. Click "Save Changes" to update the profile

## Technical Implementation

### Mock Data Structure
The component currently uses mock data to demonstrate functionality:

```javascript
const mockAccounts = [
  {
    id: 1,
    name: "Wind Farm Alpha",
    type: "PRODUCTION",
    status: "ACTIVE",
    parentId: null,
    subAccounts: [
      {
        id: 2,
        name: "Wind Farm Alpha - North",
        type: "PRODUCTION",
        status: "ACTIVE",
        parentId: 1,
        subAccounts: [],
      }
    ],
  }
];
```

### Key Components
- **Tree Component**: Ant Design Tree for hierarchical display
- **Modal Forms**: For account creation and editing
- **Card Layout**: Organized sections for different functionality
- **Form Validation**: Required field validation for account creation

### State Management
- Local state for accounts, modals, and form data
- Redux integration for user data
- Form state management with Ant Design Form

## Future Enhancements

1. **Backend Integration**: Connect to real API endpoints for account management
2. **Account Editing**: Add ability to edit existing accounts
3. **Account Deletion**: Add safe deletion with confirmation
4. **Bulk Operations**: Support for bulk account creation
5. **Search and Filter**: Add search functionality for large account hierarchies
6. **Permissions**: Role-based access control for account management
7. **Audit Trail**: Track changes to accounts and sub-accounts

## Navigation

The Account Management page is accessible through:
- Sidebar navigation: "Account Management" menu item
- Direct URL: `/account-management`

## Dependencies

- Ant Design components (Tree, Modal, Form, Card, etc.)
- React hooks (useState, useEffect)
- Redux for state management
- React Router for navigation 