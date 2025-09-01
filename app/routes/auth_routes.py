from flask import Blueprint, render_template, request, redirect, url_for, flash, abort
from flask_login import login_user, current_user, login_required, logout_user
from werkzeug.security import generate_password_hash, check_password_hash
from ..models import User
from ..extensions import db, login_manager
from datetime import datetime
import re

auth_bp = Blueprint('auth', __name__)

def admin_required(f):
    """Decorator to require admin privileges."""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for('auth.login'))
        if not current_user.is_admin:
            flash('Admin privileges required.', 'danger')
            return redirect(url_for('server.home'))
        return f(*args, **kwargs)
    return decorated_function

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

@auth_bp.route('/')
def index():
    """Redirect to appropriate page based on authentication and admin setup."""
    if current_user.is_authenticated:
        return redirect(url_for('server.home'))
    
    # Check if admin setup is needed
    admin_user = User.query.filter_by(is_admin=True).first()
    if not admin_user or not admin_user.password_hash:
        return redirect(url_for('auth.set_admin_password'))
    
    return redirect(url_for('auth.login'))

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Handle login and sessions."""
    if current_user.is_authenticated:
        return redirect(url_for('server.home'))
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and user.password_hash and user.is_active:
            if check_password_hash(user.password_hash, password):
                # Update last login time
                user.last_login = datetime.utcnow()
                db.session.commit()
                
                login_user(user)
                flash('Logged in successfully.', 'success')
                return redirect(url_for('server.home'))
            else:
                flash('Invalid username or password.', 'danger')
        else:
            flash('Invalid username or password.', 'danger')
    return render_template('login.html')

@auth_bp.route('/logout')
@login_required
def logout():
    """Logout user and clear session data."""
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('auth.login'))

@auth_bp.route('/set_admin_password', methods=['GET', 'POST'])
def set_admin_password():
    """Set up the initial admin account on first run."""
    # Check if any admin user exists
    admin_user = User.query.filter_by(is_admin=True).first()
    
    if admin_user and admin_user.password_hash:
        # Admin password already set
        flash('Admin account is already set up. Please log in.')
        return redirect(url_for('auth.login'))
    
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        email = request.form.get('email', '').strip()
        
        # Validation
        if not username or len(username) < 3:
            flash('Username must be at least 3 characters long.', 'danger')
            return render_template('set_admin_password.html')
        
        if len(password) < 8:
            flash('Password must be at least 8 characters long.', 'danger')
            return render_template('set_admin_password.html')
        
        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('set_admin_password.html')
        
        # Check if username already exists
        if User.query.filter_by(username=username).first():
            flash('Username already exists.', 'danger')
            return render_template('set_admin_password.html')
        
        # Check if email already exists (if provided)
        if email and User.query.filter_by(email=email).first():
            flash('Email already exists.', 'danger')
            return render_template('set_admin_password.html')
        
        # Create admin user
        admin_user = User(
            username=username,
            password_hash=generate_password_hash(password),
            email=email if email else None,
            is_admin=True,
            is_active=True
        )
        db.session.add(admin_user)
        db.session.commit()
        
        flash('Admin account created successfully. Please log in.', 'success')
        return redirect(url_for('auth.login'))
    
    return render_template('set_admin_password.html')

@auth_bp.route('/add_user', methods=['GET', 'POST'])
@login_required
@admin_required
def add_user():
    """Add a new user (admin only)."""
    if request.method == 'POST':
        username = request.form['username'].strip()
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        email = request.form.get('email', '').strip()
        is_admin = 'is_admin' in request.form
        
        # Validation
        if not username or len(username) < 3:
            flash('Username must be at least 3 characters long.', 'danger')
            return render_template('add_user.html')
        
        if len(password) < 8:
            flash('Password must be at least 8 characters long.', 'danger')
            return render_template('add_user.html')
        
        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('add_user.html')
        
        # Check if username already exists
        if User.query.filter_by(username=username).first():
            flash('Username already exists.', 'danger')
            return render_template('add_user.html')
        
        # Check if email already exists (if provided)
        if email and User.query.filter_by(email=email).first():
            flash('Email already exists.', 'danger')
            return render_template('add_user.html')
        
        # Create new user
        new_user = User(
            username=username,
            password_hash=generate_password_hash(password),
            email=email if email else None,
            is_admin=is_admin,
            is_active=True
        )
        db.session.add(new_user)
        db.session.commit()
        
        flash(f'User {username} added successfully.', 'success')
        return redirect(url_for('auth.manage_users'))
    
    return render_template('add_user.html')

@auth_bp.route('/change_password', methods=['GET', 'POST'])
@login_required
def change_password():
    if request.method == 'POST':
        current_password = request.form['current_password']
        new_password = request.form['new_password']
        confirm_password = request.form['confirm_password']
        if not check_password_hash(current_user.password_hash, current_password):
            flash('Current password is incorrect.', 'danger')
            return render_template('change_password.html')
        if new_password != confirm_password:
            flash('New passwords do not match.', 'danger')
            return render_template('change_password.html')
        current_user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        flash('Password changed successfully.', 'success')
        return redirect(url_for('server.home'))
    return render_template('change_password.html')

@auth_bp.route('/manage_users')
@login_required
@admin_required
def manage_users():
    """Manage all users (admin only)."""
    users = User.query.all()
    return render_template('manage_users.html', users=users)

@auth_bp.route('/edit_user/<int:user_id>', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_user(user_id):
    """Edit user details (admin only)."""
    user = User.query.get_or_404(user_id)
    
    if request.method == 'POST':
        username = request.form['username'].strip()
        email = request.form.get('email', '').strip()
        is_admin = 'is_admin' in request.form
        is_active = 'is_active' in request.form
        
        # Validation
        if not username or len(username) < 3:
            flash('Username must be at least 3 characters long.', 'danger')
            return render_template('edit_user.html', user=user)
        
        # Check if username already exists (excluding current user)
        existing_user = User.query.filter_by(username=username).first()
        if existing_user and existing_user.id != user_id:
            flash('Username already exists.', 'danger')
            return render_template('edit_user.html', user=user)
        
        # Check if email already exists (excluding current user)
        if email:
            existing_user = User.query.filter_by(email=email).first()
            if existing_user and existing_user.id != user_id:
                flash('Email already exists.', 'danger')
                return render_template('edit_user.html', user=user)
        
        # Update user
        user.username = username
        user.email = email if email else None
        user.is_admin = is_admin
        user.is_active = is_active
        
        db.session.commit()
        flash(f'User {username} updated successfully.', 'success')
        return redirect(url_for('auth.manage_users'))
    
    return render_template('edit_user.html', user=user)

@auth_bp.route('/delete_user/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def delete_user(user_id):
    """Delete a user (admin only)."""
    user = User.query.get_or_404(user_id)
    
    # Prevent admin from deleting themselves
    if user.id == current_user.id:
        flash('You cannot delete your own account.', 'danger')
        return redirect(url_for('auth.manage_users'))
    
    # Check if user has servers
    if user.servers:
        flash(f'Cannot delete user {user.username} - they have {len(user.servers)} server(s).', 'danger')
        return redirect(url_for('auth.manage_users'))
    
    username = user.username
    db.session.delete(user)
    db.session.commit()
    
    flash(f'User {username} deleted successfully.', 'success')
    return redirect(url_for('auth.manage_users'))

@auth_bp.route('/reset_user_password/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def reset_user_password(user_id):
    """Reset a user's password (admin only)."""
    user = User.query.get_or_404(user_id)
    
    new_password = request.form['new_password']
    confirm_password = request.form['confirm_password']
    
    if len(new_password) < 8:
        flash('Password must be at least 8 characters long.', 'danger')
        return redirect(url_for('auth.edit_user', user_id=user_id))
    
    if new_password != confirm_password:
        flash('Passwords do not match.', 'danger')
        return redirect(url_for('auth.edit_user', user_id=user_id))
    
    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    
    flash(f'Password for {user.username} reset successfully.', 'success')
    return redirect(url_for('auth.manage_users'))
