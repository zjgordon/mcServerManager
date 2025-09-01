"""
Tests for authentication routes and functionality.
"""
import pytest
from flask import url_for
from werkzeug.security import generate_password_hash, check_password_hash
from app.models import User
from app.extensions import db


class TestAuthentication:
    """Test authentication functionality."""
    
    def test_login_page_loads(self, client):
        """Test that the login page loads correctly."""
        response = client.get('/login')
        assert response.status_code == 200
        assert b'login' in response.data.lower()
    
    def test_valid_login(self, client, app):
        """Test login with valid credentials."""
        with app.app_context():
            # Create a test user
            user = User(
                username='testuser',
                password_hash=generate_password_hash('testpass'),
                is_admin=False
            )
            db.session.add(user)
            db.session.commit()
            
            # Attempt login
            response = client.post('/login', data={
                'username': 'testuser',
                'password': 'testpass'
            }, follow_redirects=True)
            
            assert response.status_code == 200
            assert b'Logged in successfully' in response.data
    
    def test_invalid_login(self, client, app):
        """Test login with invalid credentials."""
        with app.app_context():
            # Create a test user
            user = User(
                username='testuser',
                password_hash=generate_password_hash('testpass'),
                is_admin=False
            )
            db.session.add(user)
            db.session.commit()
            
            # Attempt login with wrong password
            response = client.post('/login', data={
                'username': 'testuser',
                'password': 'wrongpass'
            })
            
            assert b'Invalid username or password' in response.data
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user."""
        response = client.post('/login', data={
            'username': 'nonexistent',
            'password': 'password'
        })
        
        assert b'Invalid username or password' in response.data
    
    def test_logout(self, client, authenticated_client):
        """Test user logout."""
        response = authenticated_client.get('/logout', follow_redirects=True)
        assert response.status_code == 200
        assert b'logged out' in response.data.lower()
    
    def test_set_admin_password(self, client, app):
        """Test setting admin password for first time."""
        with app.app_context():
            # Create admin user without password
            admin = User(
                username='admin',
                password_hash=None,
                is_admin=True
            )
            db.session.add(admin)
            db.session.commit()
            
            # Set password
            response = client.post('/set_admin_password', data={
                'password': 'newpassword',
                'confirm_password': 'newpassword'
            }, follow_redirects=True)
            
            assert response.status_code == 200
            assert b'password set successfully' in response.data.lower()
            
            # Verify password was set
            admin = User.query.filter_by(username='admin').first()
            assert admin.password_hash is not None
            assert check_password_hash(admin.password_hash, 'newpassword')
    
    def test_set_admin_password_mismatch(self, client, app):
        """Test setting admin password with mismatched passwords."""
        with app.app_context():
            # Create admin user without password
            admin = User(
                username='admin',
                password_hash=None,
                is_admin=True
            )
            db.session.add(admin)
            db.session.commit()
            
            # Attempt to set password with mismatch
            response = client.post('/set_admin_password', data={
                'password': 'newpassword',
                'confirm_password': 'differentpassword'
            })
            
            assert b'Passwords do not match' in response.data
    
    def test_add_user_as_admin(self, client, app, admin_user):
        """Test adding a new user as admin."""
        with client.session_transaction() as sess:
            sess['_user_id'] = str(admin_user.id)
            sess['_fresh'] = True
        
        response = client.post('/add_user', data={
            'username': 'newuser',
            'password': 'newpass',
            'confirm_password': 'newpass'
        }, follow_redirects=True)
        
        assert response.status_code == 200
        assert b'User newuser added successfully' in response.data
        
        # Verify user was created
        with app.app_context():
            user = User.query.filter_by(username='newuser').first()
            assert user is not None
            assert not user.is_admin
    
    def test_add_user_as_regular_user(self, client, regular_user):
        """Test that regular users cannot add new users."""
        with client.session_transaction() as sess:
            sess['_user_id'] = str(regular_user.id)
            sess['_fresh'] = True
        
        response = client.post('/add_user', data={
            'username': 'newuser',
            'password': 'newpass',
            'confirm_password': 'newpass'
        }, follow_redirects=True)
        
        assert b'Only the admin can add new users' in response.data
    
    def test_add_duplicate_user(self, client, app, admin_user):
        """Test adding a user with existing username."""
        with app.app_context():
            # Create existing user
            existing_user = User(
                username='existinguser',
                password_hash=generate_password_hash('pass'),
                is_admin=False
            )
            db.session.add(existing_user)
            db.session.commit()
        
        with client.session_transaction() as sess:
            sess['_user_id'] = str(admin_user.id)
            sess['_fresh'] = True
        
        response = client.post('/add_user', data={
            'username': 'existinguser',
            'password': 'newpass',
            'confirm_password': 'newpass'
        })
        
        assert b'Username already exists' in response.data
    
    def test_change_password(self, client, app, regular_user):
        """Test changing user password."""
        with client.session_transaction() as sess:
            sess['_user_id'] = str(regular_user.id)
            sess['_fresh'] = True
        
        # Set a known password for the user
        with app.app_context():
            user = User.query.get(regular_user.id)
            user.password_hash = generate_password_hash('oldpass')
            db.session.commit()
        
        response = client.post('/change_password', data={
            'current_password': 'oldpass',
            'new_password': 'newpass',
            'confirm_password': 'newpass'
        }, follow_redirects=True)
        
        assert response.status_code == 200
        assert b'Password changed successfully' in response.data
        
        # Verify password was changed
        with app.app_context():
            user = User.query.get(regular_user.id)
            assert check_password_hash(user.password_hash, 'newpass')
    
    def test_change_password_wrong_current(self, client, regular_user):
        """Test changing password with wrong current password."""
        with client.session_transaction() as sess:
            sess['_user_id'] = str(regular_user.id)
            sess['_fresh'] = True
        
        response = client.post('/change_password', data={
            'current_password': 'wrongpass',
            'new_password': 'newpass',
            'confirm_password': 'newpass'
        })
        
        assert b'Current password is incorrect' in response.data
    
    def test_change_password_mismatch(self, client, app, regular_user):
        """Test changing password with mismatched new passwords."""
        with client.session_transaction() as sess:
            sess['_user_id'] = str(regular_user.id)
            sess['_fresh'] = True
        
        # Set a known password for the user
        with app.app_context():
            user = User.query.get(regular_user.id)
            user.password_hash = generate_password_hash('oldpass')
            db.session.commit()
        
        response = client.post('/change_password', data={
            'current_password': 'oldpass',
            'new_password': 'newpass',
            'confirm_password': 'differentpass'
        })
        
        assert b'New passwords do not match' in response.data
