import os
from datetime import datetime

from flask import (
    Blueprint,
    current_app,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_login import current_user, login_required, login_user, logout_user
from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db, login_manager
from ..models import User
from ..security import (
    PasswordPolicyError,
    SecurityUtils,
    audit_log,
    rate_limit,
    rate_limiter,
    validate_password_policy,
)

auth_bp = Blueprint("auth", __name__)


def admin_required(f):
    """Decorator to require admin privileges."""
    from functools import wraps

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for("auth.login"))
        if not current_user.is_admin:
            flash("Admin privileges required.", "danger")
            return redirect(url_for("server.home"))
        return f(*args, **kwargs)

    return decorated_function


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


# Removed duplicate route - server.home handles the root path


@auth_bp.route("/login", methods=["GET", "POST"])
@rate_limit(max_attempts=5, window_seconds=300)  # 5 attempts per 5 minutes
def login():
    """Handle login and sessions."""
    if current_user.is_authenticated:
        return redirect("/")

    if request.method == "POST":
        username = SecurityUtils.sanitize_input(request.form.get("username", ""))
        password = request.form.get("password", "")

        # Check rate limiting for this specific username
        max_attempts = current_app.config.get("RATELIMIT_LOGIN_ATTEMPTS", 20)
        window_seconds = current_app.config.get("RATELIMIT_LOGIN_WINDOW", 300)
        remaining_attempts = rate_limiter.get_remaining_attempts(
            f"login_{username}", max_attempts, window_seconds
        )

        if remaining_attempts == 0:
            flash(
                f"Too many login attempts. Please try again in {window_seconds // 60} minutes.",
                "danger",
            )
            return render_template("login.html")

        user = User.query.filter_by(username=username).first()
        if user and user.password_hash and user.is_active:
            if check_password_hash(user.password_hash, password):
                # Update last login time
                user.last_login = datetime.utcnow()
                db.session.commit()

                login_user(user)
                audit_log("login_success", {"username": username})
                flash("Logged in successfully.", "success")
                return redirect("/")
            else:
                audit_log("login_failed", {"username": username, "reason": "invalid_password"})
                flash("Invalid username or password.", "danger")
        else:
            audit_log(
                "login_failed",
                {"username": username, "reason": "user_not_found_or_inactive"},
            )
            flash("Invalid username or password.", "danger")

    return render_template("login.html")


@auth_bp.route("/logout")
@login_required
def logout():
    """Logout user and clear session data."""
    logout_user()
    flash("You have been logged out.", "info")
    return redirect(url_for("auth.login"))


@auth_bp.route("/set_admin_password", methods=["GET", "POST"])
@validate_password_policy
def set_admin_password():
    """Set up the initial admin account on first run."""
    # Check if any admin user exists
    admin_user = User.query.filter_by(is_admin=True).first()

    if admin_user and admin_user.password_hash:
        # Admin password already set - require authentication to change it
        if not current_user.is_authenticated or not current_user.is_admin:
            flash(
                "Admin account is already set up. "
                "Please log in as admin to change the password.",
                "danger",
            )
            return redirect(url_for("auth.login"))

    if request.method == "POST":
        username = SecurityUtils.sanitize_input(request.form.get("username", ""))
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")
        email = SecurityUtils.sanitize_input(request.form.get("email", ""))

        # Validation
        if not username or len(username) < 3:
            flash("Username must be at least 3 characters long.", "danger")
            return render_template("set_admin_password.html")

        try:
            SecurityUtils.validate_password(password, username)
        except PasswordPolicyError as e:
            flash(str(e), "danger")
            return render_template("set_admin_password.html")

        if password != confirm_password:
            flash("Passwords do not match.", "danger")
            return render_template("set_admin_password.html")

        # Check if email already exists (if provided)
        if email and User.query.filter_by(email=email).first():
            flash("Email already exists.", "danger")
            return render_template("set_admin_password.html")

        # Handle admin user creation/update
        if admin_user and not admin_user.password_hash:
            # Update existing admin user
            admin_user.username = username
            admin_user.password_hash = generate_password_hash(password)
            admin_user.email = email if email else None
            db.session.commit()

            audit_log("admin_account_updated", {"username": username, "email": email})
            flash("Admin account updated successfully. Please log in.", "success")
        else:
            # Create new admin user
            # Check if username already exists (only for new users)
            if User.query.filter_by(username=username).first():
                flash("Username already exists.", "danger")
                return render_template("set_admin_password.html")

            new_admin_user = User(
                username=username,
                password_hash=generate_password_hash(password),
                email=email if email else None,
                is_admin=True,
                is_active=True,
            )
            db.session.add(new_admin_user)
            db.session.commit()

            audit_log("admin_account_created", {"username": username, "email": email})
            flash("Admin account created successfully. Please log in.", "success")

        return redirect(url_for("auth.login"))

    return render_template("set_admin_password.html")


@auth_bp.route("/add_user", methods=["GET", "POST"])
@login_required
@admin_required
def add_user():
    """Add a new user (admin only)."""
    if request.method == "POST":
        username = request.form["username"].strip()
        password = request.form["password"]
        confirm_password = request.form["confirm_password"]
        email = request.form.get("email", "").strip()
        is_admin = "is_admin" in request.form

        # Validation
        if not username or len(username) < 3:
            flash("Username must be at least 3 characters long.", "danger")
            return render_template("add_user.html")

        if len(password) < 8:
            flash("Password must be at least 8 characters long.", "danger")
            return render_template("add_user.html")

        if password != confirm_password:
            flash("Passwords do not match.", "danger")
            return render_template("add_user.html")

        # Check if username already exists
        if User.query.filter_by(username=username).first():
            flash("Username already exists.", "danger")
            return render_template("add_user.html")

        # Check if email already exists (if provided)
        if email and User.query.filter_by(email=email).first():
            flash("Email already exists.", "danger")
            return render_template("add_user.html")

        # Create new user
        new_user = User(
            username=username,
            password_hash=generate_password_hash(password),
            email=email if email else None,
            is_admin=is_admin,
            is_active=True,
        )
        db.session.add(new_user)
        db.session.commit()

        flash(f"User {username} added successfully.", "success")
        return redirect(url_for("auth.manage_users"))

    return render_template("add_user.html")


@auth_bp.route("/change_password", methods=["GET", "POST"])
@login_required
def change_password():
    if request.method == "POST":
        current_password = request.form["current_password"]
        new_password = request.form["new_password"]
        confirm_password = request.form["confirm_password"]
        if not check_password_hash(current_user.password_hash, current_password):
            flash("Current password is incorrect.", "danger")
            return render_template("change_password.html")
        if new_password != confirm_password:
            flash("New passwords do not match.", "danger")
            return render_template("change_password.html")
        current_user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        flash("Password changed successfully.", "success")
        return redirect(url_for("server.home"))
    return render_template("change_password.html")


@auth_bp.route("/manage_users")
@login_required
@admin_required
def manage_users():
    """Manage all users (admin only)."""
    users = User.query.all()
    return render_template("manage_users.html", users=users)


@auth_bp.route("/edit_user/<int:user_id>", methods=["GET", "POST"])
@login_required
@admin_required
def edit_user(user_id):
    """Edit user details (admin only)."""
    user = User.query.get_or_404(user_id)

    if request.method == "POST":
        username = request.form["username"].strip()
        email = request.form.get("email", "").strip()
        is_admin = "is_admin" in request.form
        is_active = "is_active" in request.form

        # Validation
        if not username or len(username) < 3:
            flash("Username must be at least 3 characters long.", "danger")
            return render_template("edit_user.html", user=user)

        # Check if username already exists (excluding current user)
        existing_user = User.query.filter_by(username=username).first()
        if existing_user and existing_user.id != user_id:
            flash("Username already exists.", "danger")
            return render_template("edit_user.html", user=user)

        # Check if email already exists (excluding current user)
        if email:
            existing_user = User.query.filter_by(email=email).first()
            if existing_user and existing_user.id != user_id:
                flash("Email already exists.", "danger")
                return render_template("edit_user.html", user=user)

        # Update user
        user.username = username
        user.email = email if email else None
        user.is_admin = is_admin
        user.is_active = is_active

        db.session.commit()
        flash(f"User {username} updated successfully.", "success")
        return redirect(url_for("auth.manage_users"))

    return render_template("edit_user.html", user=user)


@auth_bp.route("/delete_user/<int:user_id>", methods=["POST"])
@login_required
@admin_required
def delete_user(user_id):
    """Delete a user (admin only)."""
    user = User.query.get_or_404(user_id)

    # Prevent admin from deleting themselves
    if user.id == current_user.id:
        flash("You cannot delete your own account.", "danger")
        return redirect(url_for("auth.manage_users"))

    # Check if user has servers
    if user.servers:
        flash(
            f"Cannot delete user {user.username} - " f"they have {len(user.servers)} server(s).",
            "danger",
        )
        return redirect(url_for("auth.manage_users"))

    username = user.username
    db.session.delete(user)
    db.session.commit()

    flash(f"User {username} deleted successfully.", "success")
    return redirect(url_for("auth.manage_users"))


@auth_bp.route("/reset_user_password/<int:user_id>", methods=["POST"])
@login_required
@admin_required
def reset_user_password(user_id):
    """Reset a user's password (admin only)."""
    user = User.query.get_or_404(user_id)

    new_password = request.form["new_password"]
    confirm_password = request.form["confirm_password"]

    if len(new_password) < 8:
        flash("Password must be at least 8 characters long.", "danger")
        return redirect(url_for("auth.edit_user", user_id=user_id))

    if new_password != confirm_password:
        flash("Passwords do not match.", "danger")
        return redirect(url_for("auth.edit_user", user_id=user_id))

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()

    flash(f"Password for {user.username} reset successfully.", "success")
    return redirect(url_for("auth.manage_users"))


@auth_bp.route("/admin_config", methods=["GET", "POST"])
@login_required
@admin_required
def admin_config():
    """Admin configuration page for system settings."""
    from ..utils import get_app_config, get_system_memory_for_admin, update_app_config

    if request.method == "POST":
        try:
            # Get form data
            app_title = request.form.get("app_title", "").strip()
            server_hostname = request.form.get("server_hostname", "").strip()
            max_total_mb = int(request.form["max_total_mb"])
            max_per_server_mb = int(request.form["max_per_server_mb"])

            # Validate the values
            if not app_title:
                flash("Application title cannot be empty.", "danger")
                return redirect(url_for("auth.admin_config"))

            if not server_hostname:
                flash("Server hostname cannot be empty.", "danger")
                return redirect(url_for("auth.admin_config"))

            if max_total_mb < 1024:  # At least 1GB
                flash("Total system memory must be at least 1GB (1024MB).", "danger")
                return redirect(url_for("auth.admin_config"))

            if max_per_server_mb < 512:  # At least 512MB per server
                flash("Maximum memory per server must be at least 512MB.", "danger")
                return redirect(url_for("auth.admin_config"))

            if max_per_server_mb > max_total_mb:
                flash(
                    "Maximum memory per server cannot exceed total system memory.",
                    "danger",
                )
                return redirect(url_for("auth.admin_config"))

            # Update the configuration
            success = update_app_config(
                app_title=app_title,
                server_hostname=server_hostname,
                max_total_mb=max_total_mb,
                max_per_server_mb=max_per_server_mb,
            )

            if success:
                flash("System configuration updated successfully.", "success")
            else:
                flash("Failed to update system configuration.", "danger")

        except ValueError:
            flash("Invalid memory values provided.", "danger")
        except Exception as e:
            flash(f"Error updating configuration: {str(e)}", "danger")

        return redirect(url_for("auth.admin_config"))

    # Get current configuration
    config = get_app_config()

    # Get system memory data for admin display
    system_memory = get_system_memory_for_admin()

    # Debug logging
    print(f"DEBUG: Current config: {config}")

    return render_template(
        "admin_config.html",
        app_title=config["app_title"],
        server_hostname=config["server_hostname"],
        max_total_mb=config["max_total_mb"],
        max_per_server_mb=config["max_server_mb"],
        system_memory=system_memory,
    )


@auth_bp.route("/admin/process_management", methods=["GET", "POST"])
@login_required
@admin_required
def process_management():
    """Admin process management page for server process oversight."""
    from ..models import Server
    from ..utils import (
        find_orphaned_minecraft_processes,
        get_server_process_info,
        periodic_status_check,
        reconcile_server_statuses,
    )

    if request.method == "POST":
        action = request.form.get("action")

        if action == "reconcile":
            # Reconcile server statuses
            summary = reconcile_server_statuses()
            flash(
                f"Process reconciliation complete: "
                f'{summary["statuses_updated"]} statuses updated, '
                f'{summary["orphaned_processes_found"]} orphaned processes found',
                "info",
            )

        elif action == "periodic_check":
            # Run periodic status check
            summary = periodic_status_check()
            flash(
                f"Periodic status check complete: "
                f'{summary["statuses_updated"]} statuses updated',
                "info",
            )

        elif action == "cleanup_orphaned":
            # Find orphaned processes (read-only, no cleanup action for safety)
            orphaned = find_orphaned_minecraft_processes()
            flash(f"Found {len(orphaned)} orphaned Minecraft processes", "warning")

        return redirect(url_for("auth.process_management"))

    # Get current server statuses
    servers = Server.query.all()

    # Get process information for each server
    for server in servers:
        if server.pid:
            server.process_info = get_server_process_info(server)

    # Find orphaned processes
    orphaned_processes = find_orphaned_minecraft_processes()

    return render_template(
        "process_management.html",
        servers=servers,
        orphaned_processes=orphaned_processes,
    )


@auth_bp.route("/admin/status_check", methods=["POST"])
def status_check_endpoint():
    """
    Endpoint for periodic status checks.
    This can be called by external schedulers (cron, systemd timers, etc.)

    Requires a simple API key for security.
    """
    # Simple API key check (you can enhance this with proper authentication)
    api_key = request.headers.get("X-API-Key") or request.form.get("api_key")
    expected_key = os.environ.get("STATUS_CHECK_API_KEY", "default_key_change_me")

    if api_key != expected_key:
        return jsonify({"error": "Invalid API key"}), 401

    try:
        from ..utils import periodic_status_check

        summary = periodic_status_check()

        return jsonify(
            {
                "success": True,
                "timestamp": datetime.utcnow().isoformat(),
                "summary": summary,
            }
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat(),
                }
            ),
            500,
        )
