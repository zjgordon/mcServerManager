from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, current_user, login_required, logout_user
from werkzeug.security import generate_password_hash, check_password_hash
from ..models import User
from ..extensions import db, login_manager

auth_bp = Blueprint('auth', __name__)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Handle login and sessions."""
    if current_user.is_authenticated:
        return redirect(url_for('server.home'))
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and user.password_hash:
            if check_password_hash(user.password_hash, password):
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
    admin_user = User.query.filter_by(username='admin').first()
    if not admin_user or admin_user.password_hash:
        # Admin password already set
        flash('Admin password is already set. Please log in.')
        return redirect(url_for('auth.login'))
    if request.method == 'POST':
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('set_admin_password.html')
        admin_user.password_hash = generate_password_hash(password)
        db.session.commit()
        flash('Admin password set successfully. Please log in.', 'success')
        return redirect(url_for('auth.login'))
    return render_template('set_admin_password.html')

@auth_bp.route('/add_user', methods=['GET', 'POST'])
@login_required
def add_user():
    if not current_user.is_admin:
        flash('Only the admin can add new users.', 'danger')
        return redirect(url_for('server.home'))
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('add_user.html')
        if User.query.filter_by(username=username).first():
            flash('Username already exists.', 'danger')
            return render_template('add_user.html')
        new_user = User(username=username, password_hash=generate_password_hash(password), is_admin=False)
        db.session.add(new_user)
        db.session.commit()
        flash(f'User {username} added successfully.', 'success')
        return redirect(url_for('server.home'))
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
