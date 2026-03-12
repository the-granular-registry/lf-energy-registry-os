# UserBadge Component

A reusable user profile badge component with dropdown menu, typically positioned at the bottom of a sidebar.

## Preview

![UserBadge Component](preview.png)

The badge displays:
- User avatar (40px circular)
- Username (bold)
- Organization name (lighter text)
- More options icon (3 dots)
- Dropdown menu (Settings, Logout)

## Installation

### Dependencies

```bash
npm install antd @ant-design/icons react-router-dom
```

### Files Required

Copy these files to your project:
- `UserBadge.js` - Main component
- `UserBadge.example.js` - Usage examples (optional)

## Basic Usage

```jsx
import UserBadge from './components/UserBadge';
import avatarImage from './assets/avatar.jpg';

function Sidebar() {
  const user = {
    username: "John Doe",
    organisation: "Acme Corp"
  };

  return (
    <div style={{ position: "relative", height: "100vh" }}>
      {/* Your sidebar content */}
      
      <UserBadge
        user={user}
        avatarSrc={avatarImage}
      />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `user` | Object | `{}` | User data object with `username` and `organisation` |
| `user.username` | string | - | User's display name |
| `user.organisation` | string | - | User's organization name |
| `avatarSrc` | string | - | URL or path to avatar image (shows initial if not provided) |
| `menuItems` | Array | Default menu | Custom dropdown menu items |
| `onMenuClick` | Function | Default handler | Callback when menu item clicked `(key) => {}` |
| `highlightRoute` | string | `null` | Route path that triggers blue highlight |
| `style` | Object | `{}` | Additional container styles |
| `showMenu` | boolean | `true` | Show/hide dropdown menu |

## Examples

### With Custom Menu

```jsx
const customMenu = [
  {
    key: "profile",
    label: "My Profile",
    icon: <UserOutlined />,
  },
  {
    key: "settings",
    label: "Settings",
    icon: <SettingOutlined />,
  },
  { type: "divider" },
  {
    key: "logout",
    label: "Sign Out",
    icon: <LogoutOutlined />,
    danger: true,
  },
];

const handleMenuClick = (key) => {
  if (key === "logout") {
    // Handle logout
  }
};

<UserBadge
  user={user}
  avatarSrc={avatar}
  menuItems={customMenu}
  onMenuClick={handleMenuClick}
/>
```

### With Redux/Context

```jsx
import { useSelector } from 'react-redux';

function UserBadgeContainer() {
  const userData = useSelector(state => state.user.userInfo);
  
  return (
    <UserBadge
      user={{
        username: userData?.name,
        organisation: userData?.org
      }}
      avatarSrc={userData?.avatar}
      onMenuClick={(key) => {
        if (key === 'logout') {
          dispatch(logoutUser());
        }
      }}
    />
  );
}
```

### Route Highlighting

```jsx
// Badge highlights with blue background when on /account-management
<UserBadge
  user={user}
  avatarSrc={avatar}
  highlightRoute="/account-management"
/>
```

### Display Only (No Menu)

```jsx
<UserBadge
  user={user}
  avatarSrc={avatar}
  showMenu={false}
/>
```

### Without Avatar Image

```jsx
// Shows first letter of username as initial
<UserBadge
  user={{ username: "John Doe", organisation: "Acme" }}
/>
// Displays "J" in avatar circle
```

## Styling

### Default Styles
- Container: 80px height, positioned absolutely at bottom
- Border: 1px solid #f0f0f0 at top
- Avatar: 40px circular
- Username: 14px, bold, #202124
- Organization: 12px, #80868B
- Hover: pointer cursor
- Active: blue background (#0057FF) with white text

### Custom Styling

```jsx
<UserBadge
  user={user}
  avatarSrc={avatar}
  style={{
    borderTop: "2px solid #1890ff",
    backgroundColor: "#f5f5f5",
    width: "100%",
    left: "0"
  }}
/>
```

## Integration with Existing Sidebar

```jsx
function AppSidebar() {
  const { userData } = useUser();
  
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "relative",
      width: "250px"
    }}>
      {/* Logo */}
      <div style={{ padding: "16px" }}>
        <img src={logo} alt="Logo" />
      </div>
      
      {/* Navigation Menu */}
      <Menu mode="vertical">
        <Menu.Item key="dashboard">Dashboard</Menu.Item>
        <Menu.Item key="reports">Reports</Menu.Item>
      </Menu>
      
      {/* User Badge at Bottom */}
      <UserBadge
        user={userData?.userInfo}
        avatarSrc={userData?.avatar}
        onMenuClick={(key) => {
          if (key === 'logout') {
            handleLogout();
          } else if (key === 'setting') {
            navigate('/settings');
          }
        }}
      />
    </div>
  );
}
```

## Default Menu Structure

If no `menuItems` prop provided, defaults to:

```javascript
[
  {
    key: "setting",
    label: "Settings",
    icon: <SettingOutlined />
  },
  {
    key: "logout",
    label: "Log Out",
    icon: <LogoutOutlined />,
    danger: true
  }
]
```

## Accessibility

- Keyboard navigable dropdown
- Click/touch support
- Semantic HTML structure
- Icon labels for screen readers

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Notes

- Requires parent container with `position: relative`
- Uses Ant Design components internally
- Responsive to route changes via React Router
- Text truncates with ellipsis on overflow
- Avatar shows first letter initial as fallback

## Troubleshooting

**Badge not visible?**
- Ensure parent has `position: relative` and sufficient height
- Check z-index conflicts

**Menu not opening?**
- Verify Ant Design CSS is imported: `import 'antd/dist/reset.css';`
- Check React Router is configured

**Avatar not showing?**
- Verify image path is correct
- Check network tab for 404 errors
- Component will show initial letter as fallback

## License

MIT

