"""
Alerting system for critical issues in mcServerManager.

This module provides comprehensive alerting capabilities including:
- Critical error alerting
- Performance threshold alerts
- Security event alerts
- System resource alerts
- Custom alert rules
"""

import smtplib
import time
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Union

from flask import current_app

from .logging import logger


class AlertRule:
    """Base class for alert rules."""

    def __init__(self, name: str, threshold: Union[int, float], duration: int = 0):
        self.name = name
        self.threshold = threshold
        self.duration = duration  # seconds
        self.triggered_at: Union[float, None] = None
        self.alert_count = 0

    def check(self, value: Union[int, float], context: Dict[str, Any] = None) -> bool:
        """Check if alert condition is met."""
        raise NotImplementedError

    def reset(self):
        """Reset alert state."""
        self.triggered_at = None
        self.alert_count = 0


class ThresholdAlert(AlertRule):
    """Alert when value exceeds threshold."""

    def __init__(self, name: str, threshold: Union[int, float], duration: int = 0):
        super().__init__(name, threshold, duration)

    def check(self, value: Union[int, float], context: Dict[str, Any] = None) -> bool:
        """Check if value exceeds threshold."""
        if value > self.threshold:
            if self.triggered_at is None:
                self.triggered_at = time.time()
                self.alert_count = 1
                return True
            elif time.time() - self.triggered_at >= self.duration:
                self.alert_count += 1
                return True
        else:
            self.reset()
        return False


class BelowThresholdAlert(AlertRule):
    """Alert when value falls below threshold."""

    def __init__(self, name: str, threshold: Union[int, float], duration: int = 0):
        super().__init__(name, threshold, duration)

    def check(self, value: Union[int, float], context: Dict[str, Any] = None) -> bool:
        """Check if value falls below threshold."""
        if value < self.threshold:
            if self.triggered_at is None:
                self.triggered_at = time.time()
                self.alert_count = 1
                return True
            elif time.time() - self.triggered_at >= self.duration:
                self.alert_count += 1
                return True
        else:
            self.reset()
        return False


class AlertManager:
    """Manages alerting system for the application."""

    def __init__(self):
        self.alert_rules: Dict[str, AlertRule] = {}
        self.alert_history: List[Dict[str, Any]] = []
        self._setup_default_rules()

    def _setup_default_rules(self):
        """Set up default alert rules."""
        # CPU usage alerts
        self.add_rule(ThresholdAlert("high_cpu_usage", 80.0, 60))  # 80% for 1 minute
        self.add_rule(ThresholdAlert("critical_cpu_usage", 95.0, 30))  # 95% for 30 seconds

        # Memory usage alerts
        self.add_rule(ThresholdAlert("high_memory_usage", 85.0, 60))  # 85% for 1 minute
        self.add_rule(ThresholdAlert("critical_memory_usage", 95.0, 30))  # 95% for 30 seconds

        # Disk space alerts
        self.add_rule(ThresholdAlert("low_disk_space", 90.0, 0))  # 90% immediately
        self.add_rule(ThresholdAlert("critical_disk_space", 95.0, 0))  # 95% immediately

        # Database connection alerts
        self.add_rule(ThresholdAlert("high_db_connections", 80, 60))  # 80 connections for 1 minute

        # Error rate alerts
        self.add_rule(ThresholdAlert("high_error_rate", 10, 300))  # 10 errors in 5 minutes

    def add_rule(self, rule: AlertRule):
        """Add an alert rule."""
        self.alert_rules[rule.name] = rule

    def check_alert(
        self, rule_name: str, value: Union[int, float], context: Dict[str, Any] = None
    ) -> bool:
        """Check if an alert should be triggered."""
        if rule_name not in self.alert_rules:
            logger.warning(f"Alert rule '{rule_name}' not found")
            return False

        rule = self.alert_rules[rule_name]
        if rule.check(value, context):
            self._trigger_alert(rule_name, value, context)
            return True
        return False

    def _trigger_alert(
        self, rule_name: str, value: Union[int, float], context: Dict[str, Any] = None
    ):
        """Trigger an alert."""
        rule = self.alert_rules[rule_name]
        alert_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "rule_name": rule_name,
            "threshold": rule.threshold,
            "current_value": value,
            "duration": rule.duration,
            "alert_count": rule.alert_count,
            "context": context or {},
        }

        # Log the alert
        logger.critical(
            f"ALERT TRIGGERED: {rule_name}",
            {
                "event_type": "alert",
                "alert_data": alert_data,
            },
        )

        # Add to history
        self.alert_history.append(alert_data)

        # Send notifications
        self._send_alert_notifications(alert_data)

    def _send_alert_notifications(self, alert_data: Dict[str, Any]):
        """Send alert notifications via configured channels."""
        # Log to security log
        logger.security_event("alert_triggered", alert_data)

        # Send email notification if configured
        if self._is_email_configured():
            self._send_email_alert(alert_data)

        # Send webhook notification if configured
        if self._is_webhook_configured():
            self._send_webhook_alert(alert_data)

    def _is_email_configured(self) -> bool:
        """Check if email notifications are configured."""
        return bool(
            current_app.config.get("ALERT_EMAIL_SMTP_HOST")
            and current_app.config.get("ALERT_EMAIL_FROM")
            and current_app.config.get("ALERT_EMAIL_TO")
        )

    def _is_webhook_configured(self) -> bool:
        """Check if webhook notifications are configured."""
        return bool(current_app.config.get("ALERT_WEBHOOK_URL"))

    def _send_email_alert(self, alert_data: Dict[str, Any]):
        """Send email alert notification."""
        try:
            smtp_host = current_app.config.get("ALERT_EMAIL_SMTP_HOST")
            smtp_port = current_app.config.get("ALERT_EMAIL_SMTP_PORT", 587)
            smtp_user = current_app.config.get("ALERT_EMAIL_SMTP_USER")
            smtp_password = current_app.config.get("ALERT_EMAIL_SMTP_PASSWORD")
            from_email = current_app.config.get("ALERT_EMAIL_FROM")
            to_emails = current_app.config.get("ALERT_EMAIL_TO", [])

            if not isinstance(to_emails, list):
                to_emails = [to_emails]

            msg = MIMEMultipart()
            msg["From"] = from_email
            msg["To"] = ", ".join(to_emails)
            msg["Subject"] = f"ALERT: {alert_data['rule_name']} - mcServerManager"

            body = f"""
Alert Details:
- Rule: {alert_data['rule_name']}
- Threshold: {alert_data['threshold']}
- Current Value: {alert_data['current_value']}
- Timestamp: {alert_data['timestamp']}
- Alert Count: {alert_data['alert_count']}

Context: {alert_data.get('context', {})}

This is an automated alert from mcServerManager.
            """

            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(smtp_host, smtp_port) as server:
                if smtp_user and smtp_password:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                server.send_message(msg)

            logger.info(f"Email alert sent for rule: {alert_data['rule_name']}")

        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")

    def _send_webhook_alert(self, alert_data: Dict[str, Any]):
        """Send webhook alert notification."""
        try:
            import requests

            webhook_url = current_app.config.get("ALERT_WEBHOOK_URL")
            webhook_headers = current_app.config.get("ALERT_WEBHOOK_HEADERS", {})

            payload = {
                "text": f"ALERT: {alert_data['rule_name']} - mcServerManager",
                "attachments": [
                    {
                        "color": "danger",
                        "fields": [
                            {
                                "title": "Rule",
                                "value": alert_data["rule_name"],
                                "short": True,
                            },
                            {
                                "title": "Threshold",
                                "value": str(alert_data["threshold"]),
                                "short": True,
                            },
                            {
                                "title": "Current Value",
                                "value": str(alert_data["current_value"]),
                                "short": True,
                            },
                            {
                                "title": "Timestamp",
                                "value": alert_data["timestamp"],
                                "short": True,
                            },
                        ],
                    }
                ],
            }

            response = requests.post(
                webhook_url,
                json=payload,
                headers=webhook_headers,
                timeout=10,
            )
            response.raise_for_status()

            logger.info(f"Webhook alert sent for rule: {alert_data['rule_name']}")

        except Exception as e:
            logger.error(f"Failed to send webhook alert: {e}")

    def get_alert_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent alert history."""
        return self.alert_history[-limit:]

    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get currently active alerts."""
        active_alerts = []
        for rule_name, rule in self.alert_rules.items():
            if rule.triggered_at is not None:
                active_alerts.append(
                    {
                        "rule_name": rule_name,
                        "threshold": rule.threshold,
                        "triggered_at": rule.triggered_at,
                        "alert_count": rule.alert_count,
                        "duration": rule.duration,
                    }
                )
        return active_alerts

    def clear_alert(self, rule_name: str):
        """Clear a specific alert."""
        if rule_name in self.alert_rules:
            self.alert_rules[rule_name].reset()
            logger.info(f"Alert cleared for rule: {rule_name}")

    def clear_all_alerts(self):
        """Clear all active alerts."""
        for rule in self.alert_rules.values():
            rule.reset()
        logger.info("All alerts cleared")


# Global alert manager instance
alert_manager = AlertManager()


def check_system_alerts(metrics: Dict[str, Any]):
    """Check system metrics against alert rules."""
    # CPU usage alerts
    if "cpu" in metrics and "usage_percent" in metrics["cpu"]:
        alert_manager.check_alert("high_cpu_usage", metrics["cpu"]["usage_percent"])
        alert_manager.check_alert("critical_cpu_usage", metrics["cpu"]["usage_percent"])

    # Memory usage alerts
    if "memory" in metrics and "usage_percent" in metrics["memory"]:
        alert_manager.check_alert("high_memory_usage", metrics["memory"]["usage_percent"])
        alert_manager.check_alert("critical_memory_usage", metrics["memory"]["usage_percent"])

    # Disk space alerts
    if "disk" in metrics and "usage_percent" in metrics["disk"]:
        alert_manager.check_alert("low_disk_space", metrics["disk"]["usage_percent"])
        alert_manager.check_alert("critical_disk_space", metrics["disk"]["usage_percent"])


def check_database_alerts(pool_metrics: Dict[str, Any]):
    """Check database metrics against alert rules."""
    if "checked_out" in pool_metrics:
        total_connections = pool_metrics.get("pool_size", 0) + pool_metrics.get("overflow", 0)
        if total_connections > 0:
            usage_percent = (pool_metrics["checked_out"] / total_connections) * 100
            alert_manager.check_alert("high_db_connections", usage_percent)


def check_error_rate_alerts(error_count: int, time_window: int = 300):
    """Check error rate against alert rules."""
    alert_manager.check_alert("high_error_rate", error_count, {"time_window": time_window})


def trigger_manual_alert(rule_name: str, message: str, context: Dict[str, Any] = None):
    """Manually trigger an alert."""
    logger.critical(
        f"MANUAL ALERT: {message}",
        {
            "event_type": "manual_alert",
            "rule_name": rule_name,
            "message": message,
            "context": context or {},
        },
    )

    alert_data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "rule_name": rule_name,
        "message": message,
        "context": context or {},
        "manual": True,
    }

    alert_manager.alert_history.append(alert_data)
    alert_manager._send_alert_notifications(alert_data)
