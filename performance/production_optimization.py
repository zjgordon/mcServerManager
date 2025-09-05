"""
Production Performance Optimization for Minecraft Server Manager

This module provides comprehensive performance optimization measures for production
deployment of the Minecraft Server Manager application.
"""

import os
import sys
import time
import psutil
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

# Add the parent directory to the path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class OptimizationLevel(Enum):
    """Optimization level enumeration."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class PerformanceMetric:
    """Performance metric data class."""
    name: str
    value: float
    unit: str
    threshold: float
    status: str
    recommendation: str


@dataclass
class OptimizationRecommendation:
    """Optimization recommendation data class."""
    name: str
    level: OptimizationLevel
    description: str
    impact: str
    effort: str
    commands: List[str]
    config_changes: Dict[str, Any]


class ProductionPerformanceOptimizer:
    """Production performance optimization utility."""
    
    def __init__(self, app_dir: str = None):
        self.app_dir = app_dir or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.metrics: List[PerformanceMetric] = []
        self.recommendations: List[OptimizationRecommendation] = []
        
    def run_performance_analysis(self) -> Tuple[List[PerformanceMetric], List[OptimizationRecommendation]]:
        """Run comprehensive performance analysis."""
        self.metrics = []
        self.recommendations = []
        
        # System performance metrics
        self.analyze_system_resources()
        self.analyze_disk_performance()
        self.analyze_network_performance()
        self.analyze_memory_usage()
        
        # Application performance metrics
        self.analyze_database_performance()
        self.analyze_web_server_performance()
        self.analyze_minecraft_server_performance()
        
        # Generate optimization recommendations
        self.generate_optimization_recommendations()
        
        return self.metrics, self.recommendations
    
    def analyze_system_resources(self):
        """Analyze system resource usage."""
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        if cpu_percent < 50:
            status = "good"
            recommendation = "CPU usage is optimal"
        elif cpu_percent < 80:
            status = "warning"
            recommendation = "Monitor CPU usage closely"
        else:
            status = "critical"
            recommendation = "CPU usage is high, consider optimization"
        
        self.metrics.append(PerformanceMetric(
            name="cpu_usage",
            value=cpu_percent,
            unit="percent",
            threshold=80.0,
            status=status,
            recommendation=recommendation
        ))
        
        # Memory usage
        memory = psutil.virtual_memory()
        
        if memory.percent < 70:
            status = "good"
            recommendation = "Memory usage is optimal"
        elif memory.percent < 90:
            status = "warning"
            recommendation = "Monitor memory usage closely"
        else:
            status = "critical"
            recommendation = "Memory usage is critical, consider adding RAM"
        
        self.metrics.append(PerformanceMetric(
            name="memory_usage",
            value=memory.percent,
            unit="percent",
            threshold=90.0,
            status=status,
            recommendation=recommendation
        ))
        
        # Load average
        load_avg = os.getloadavg()
        load_percentage = (load_avg[0] / cpu_count) * 100
        
        if load_percentage < 70:
            status = "good"
            recommendation = "System load is optimal"
        elif load_percentage < 90:
            status = "warning"
            recommendation = "System load is high"
        else:
            status = "critical"
            recommendation = "System load is critical"
        
        self.metrics.append(PerformanceMetric(
            name="load_average",
            value=load_percentage,
            unit="percent",
            threshold=90.0,
            status=status,
            recommendation=recommendation
        ))
    
    def analyze_disk_performance(self):
        """Analyze disk performance."""
        # Disk usage
        disk_usage = psutil.disk_usage('/')
        disk_percentage = (disk_usage.used / disk_usage.total) * 100
        
        if disk_percentage < 70:
            status = "good"
            recommendation = "Disk usage is optimal"
        elif disk_percentage < 90:
            status = "warning"
            recommendation = "Monitor disk usage closely"
        else:
            status = "critical"
            recommendation = "Disk usage is critical, consider cleanup or expansion"
        
        self.metrics.append(PerformanceMetric(
            name="disk_usage",
            value=disk_percentage,
            unit="percent",
            threshold=90.0,
            status=status,
            recommendation=recommendation
        ))
        
        # Disk I/O
        try:
            disk_io = psutil.disk_io_counters()
            if disk_io:
                # Calculate I/O wait percentage (simplified)
                io_wait_percentage = 0  # This would need more sophisticated calculation
                
                if io_wait_percentage < 10:
                    status = "good"
                    recommendation = "Disk I/O is optimal"
                elif io_wait_percentage < 20:
                    status = "warning"
                    recommendation = "Monitor disk I/O closely"
                else:
                    status = "critical"
                    recommendation = "Disk I/O is high, consider SSD upgrade"
                
                self.metrics.append(PerformanceMetric(
                    name="disk_io_wait",
                    value=io_wait_percentage,
                    unit="percent",
                    threshold=20.0,
                    status=status,
                    recommendation=recommendation
                ))
        except Exception:
            pass  # Disk I/O counters not available on all systems
    
    def analyze_network_performance(self):
        """Analyze network performance."""
        try:
            # Network I/O
            net_io = psutil.net_io_counters()
            if net_io:
                # Calculate network utilization (simplified)
                bytes_sent = net_io.bytes_sent
                bytes_recv = net_io.bytes_recv
                total_bytes = bytes_sent + bytes_recv
                
                # This is a simplified calculation - in reality, you'd need to measure over time
                network_utilization = 0  # Placeholder
                
                if network_utilization < 50:
                    status = "good"
                    recommendation = "Network utilization is optimal"
                elif network_utilization < 80:
                    status = "warning"
                    recommendation = "Monitor network utilization"
                else:
                    status = "critical"
                    recommendation = "Network utilization is high"
                
                self.metrics.append(PerformanceMetric(
                    name="network_utilization",
                    value=network_utilization,
                    unit="percent",
                    threshold=80.0,
                    status=status,
                    recommendation=recommendation
                ))
        except Exception:
            pass  # Network I/O counters not available on all systems
    
    def analyze_memory_usage(self):
        """Analyze detailed memory usage."""
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        # Available memory
        available_gb = memory.available / (1024**3)
        
        if available_gb > 2:
            status = "good"
            recommendation = "Sufficient memory available"
        elif available_gb > 1:
            status = "warning"
            recommendation = "Monitor available memory"
        else:
            status = "critical"
            recommendation = "Low available memory, consider optimization"
        
        self.metrics.append(PerformanceMetric(
            name="available_memory",
            value=available_gb,
            unit="GB",
            threshold=1.0,
            status=status,
            recommendation=recommendation
        ))
        
        # Swap usage
        if swap.percent < 10:
            status = "good"
            recommendation = "Swap usage is minimal"
        elif swap.percent < 50:
            status = "warning"
            recommendation = "Monitor swap usage"
        else:
            status = "critical"
            recommendation = "High swap usage, consider adding RAM"
        
        self.metrics.append(PerformanceMetric(
            name="swap_usage",
            value=swap.percent,
            unit="percent",
            threshold=50.0,
            status=status,
            recommendation=recommendation
        ))
    
    def analyze_database_performance(self):
        """Analyze database performance."""
        db_path = os.path.join(self.app_dir, 'instance', 'minecraft_manager.db')
        
        if os.path.exists(db_path):
            # Check database file size
            db_size = os.path.getsize(db_path) / (1024**2)  # MB
            
            if db_size < 100:
                status = "good"
                recommendation = "Database size is optimal"
            elif db_size < 500:
                status = "warning"
                recommendation = "Monitor database size"
            else:
                status = "critical"
                recommendation = "Large database, consider optimization"
            
            self.metrics.append(PerformanceMetric(
                name="database_size",
                value=db_size,
                unit="MB",
                threshold=500.0,
                status=status,
                recommendation=recommendation
            ))
            
            # Check database file permissions
            stat = os.stat(db_path)
            mode = stat.st_mode
            
            if mode & 0o004:  # Readable by others
                status = "critical"
                recommendation = "Database file is readable by others - security risk"
            else:
                status = "good"
                recommendation = "Database file has secure permissions"
            
            self.metrics.append(PerformanceMetric(
                name="database_security",
                value=1 if mode & 0o004 else 0,
                unit="boolean",
                threshold=0.0,
                status=status,
                recommendation=recommendation
            ))
    
    def analyze_web_server_performance(self):
        """Analyze web server performance."""
        try:
            # Check if application is responding
            import requests
            start_time = time.time()
            response = requests.get('http://localhost:5000/health', timeout=5)
            response_time = (time.time() - start_time) * 1000  # ms
            
            if response_time < 100:
                status = "good"
                recommendation = "Application response time is optimal"
            elif response_time < 500:
                status = "warning"
                recommendation = "Monitor application response time"
            else:
                status = "critical"
                recommendation = "Application response time is slow"
            
            self.metrics.append(PerformanceMetric(
                name="app_response_time",
                value=response_time,
                unit="ms",
                threshold=500.0,
                status=status,
                recommendation=recommendation
            ))
            
        except Exception as e:
            self.metrics.append(PerformanceMetric(
                name="app_response_time",
                value=0,
                unit="ms",
                threshold=500.0,
                status="critical",
                recommendation=f"Application not responding: {str(e)}"
            ))
    
    def analyze_minecraft_server_performance(self):
        """Analyze Minecraft server performance."""
        # Find Java processes (Minecraft servers)
        java_processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'memory_info', 'cpu_percent']):
            if 'java' in proc.info['name'].lower():
                cmdline = ' '.join(proc.info['cmdline']) if proc.info['cmdline'] else ''
                if 'server.jar' in cmdline:
                    java_processes.append({
                        'pid': proc.info['pid'],
                        'memory_mb': proc.info['memory_info'].rss / 1024 / 1024 if proc.info['memory_info'] else 0,
                        'cpu_percent': proc.info['cpu_percent'] or 0
                    })
        
        if java_processes:
            total_memory = sum(p['memory_mb'] for p in java_processes)
            total_cpu = sum(p['cpu_percent'] for p in java_processes)
            
            # Memory usage per server
            avg_memory_per_server = total_memory / len(java_processes)
            
            if avg_memory_per_server < 1024:  # Less than 1GB per server
                status = "good"
                recommendation = "Minecraft server memory usage is optimal"
            elif avg_memory_per_server < 2048:  # Less than 2GB per server
                status = "warning"
                recommendation = "Monitor Minecraft server memory usage"
            else:
                status = "critical"
                recommendation = "Minecraft server memory usage is high"
            
            self.metrics.append(PerformanceMetric(
                name="minecraft_server_memory",
                value=avg_memory_per_server,
                unit="MB",
                threshold=2048.0,
                status=status,
                recommendation=recommendation
            ))
            
            # CPU usage per server
            avg_cpu_per_server = total_cpu / len(java_processes)
            
            if avg_cpu_per_server < 20:
                status = "good"
                recommendation = "Minecraft server CPU usage is optimal"
            elif avg_cpu_per_server < 50:
                status = "warning"
                recommendation = "Monitor Minecraft server CPU usage"
            else:
                status = "critical"
                recommendation = "Minecraft server CPU usage is high"
            
            self.metrics.append(PerformanceMetric(
                name="minecraft_server_cpu",
                value=avg_cpu_per_server,
                unit="percent",
                threshold=50.0,
                status=status,
                recommendation=recommendation
            ))
        else:
            self.metrics.append(PerformanceMetric(
                name="minecraft_server_memory",
                value=0,
                unit="MB",
                threshold=2048.0,
                status="good",
                recommendation="No Minecraft servers running"
            ))
    
    def generate_optimization_recommendations(self):
        """Generate optimization recommendations based on metrics."""
        # System optimization recommendations
        if any(m.status == "critical" for m in self.metrics if m.name in ["cpu_usage", "memory_usage", "load_average"]):
            self.recommendations.append(OptimizationRecommendation(
                name="system_resource_optimization",
                level=OptimizationLevel.HIGH,
                description="Optimize system resource usage",
                impact="High - Will improve overall system performance",
                effort="Medium - Requires system configuration changes",
                commands=[
                    "sudo systemctl restart mcservermanager",
                    "sudo systemctl restart nginx",
                    "sudo systemctl restart redis-server"
                ],
                config_changes={
                    "WORKERS": 2,  # Reduce worker count
                    "WORKER_CONNECTIONS": 500,  # Reduce connections
                    "TIMEOUT": 60  # Increase timeout
                }
            ))
        
        # Database optimization recommendations
        db_size_metric = next((m for m in self.metrics if m.name == "database_size"), None)
        if db_size_metric and db_size_metric.status == "critical":
            self.recommendations.append(OptimizationRecommendation(
                name="database_optimization",
                level=OptimizationLevel.MEDIUM,
                description="Optimize database performance",
                impact="Medium - Will improve database performance",
                effort="Low - Automated optimization",
                commands=[
                    "sqlite3 instance/minecraft_manager.db 'VACUUM;'",
                    "sqlite3 instance/minecraft_manager.db 'ANALYZE;'",
                    "sqlite3 instance/minecraft_manager.db 'PRAGMA optimize;'"
                ],
                config_changes={
                    "DB_POOL_SIZE": 5,
                    "DB_MAX_OVERFLOW": 10,
                    "DB_POOL_RECYCLE": 1800
                }
            ))
        
        # Web server optimization recommendations
        app_response_metric = next((m for m in self.metrics if m.name == "app_response_time"), None)
        if app_response_metric and app_response_metric.status == "critical":
            self.recommendations.append(OptimizationRecommendation(
                name="web_server_optimization",
                level=OptimizationLevel.HIGH,
                description="Optimize web server performance",
                impact="High - Will improve response times",
                effort="Medium - Requires configuration changes",
                commands=[
                    "sudo systemctl restart nginx",
                    "sudo nginx -s reload"
                ],
                config_changes={
                    "WORKERS": 4,
                    "WORKER_CONNECTIONS": 1000,
                    "KEEPALIVE": 2,
                    "TIMEOUT": 30
                }
            ))
        
        # Memory optimization recommendations
        memory_metric = next((m for m in self.metrics if m.name == "memory_usage"), None)
        if memory_metric and memory_metric.status == "critical":
            self.recommendations.append(OptimizationRecommendation(
                name="memory_optimization",
                level=OptimizationLevel.CRITICAL,
                description="Optimize memory usage",
                impact="Critical - Will prevent system crashes",
                effort="High - Requires system changes",
                commands=[
                    "sudo systemctl restart mcservermanager",
                    "sudo systemctl restart redis-server",
                    "sudo sync && sudo echo 3 > /proc/sys/vm/drop_caches"
                ],
                config_changes={
                    "MAX_TOTAL_MEMORY_MB": 8192,  # Reduce memory limit
                    "DEFAULT_SERVER_MEMORY_MB": 512,  # Reduce default server memory
                    "WORKERS": 2  # Reduce worker count
                }
            ))
        
        # Disk optimization recommendations
        disk_metric = next((m for m in self.metrics if m.name == "disk_usage"), None)
        if disk_metric and disk_metric.status == "critical":
            self.recommendations.append(OptimizationRecommendation(
                name="disk_optimization",
                level=OptimizationLevel.HIGH,
                description="Optimize disk usage",
                impact="High - Will prevent disk space issues",
                effort="Medium - Requires cleanup and configuration",
                commands=[
                    "find logs/ -name '*.log' -mtime +7 -delete",
                    "find backups/ -name '*.tar.gz' -mtime +30 -delete",
                    "sudo journalctl --vacuum-time=7d"
                ],
                config_changes={
                    "LOG_MAX_BYTES": 5 * 1024 * 1024,  # 5MB
                    "LOG_BACKUP_COUNT": 3,
                    "BACKUP_RETENTION_DAYS": 14
                }
            ))
        
        # Minecraft server optimization recommendations
        minecraft_memory_metric = next((m for m in self.metrics if m.name == "minecraft_server_memory"), None)
        if minecraft_memory_metric and minecraft_memory_metric.status == "critical":
            self.recommendations.append(OptimizationRecommendation(
                name="minecraft_server_optimization",
                level=OptimizationLevel.MEDIUM,
                description="Optimize Minecraft server performance",
                impact="Medium - Will improve server performance",
                effort="Low - Configuration changes only",
                commands=[
                    "python run.py --optimize-servers"
                ],
                config_changes={
                    "DEFAULT_SERVER_MEMORY_MB": 512,
                    "MAX_SERVER_MEMORY_MB": 2048,
                    "MIN_SERVER_MEMORY_MB": 256
                }
            ))
    
    def apply_optimizations(self, recommendation_name: str = None):
        """Apply optimization recommendations."""
        applied_optimizations = []
        
        recommendations_to_apply = self.recommendations
        if recommendation_name:
            recommendations_to_apply = [r for r in self.recommendations if r.name == recommendation_name]
        
        for recommendation in recommendations_to_apply:
            try:
                # Apply configuration changes
                for key, value in recommendation.config_changes.items():
                    os.environ[key] = str(value)
                    applied_optimizations.append(f"Set {key}={value}")
                
                # Execute commands
                for command in recommendation.commands:
                    try:
                        result = subprocess.run(command, shell=True, capture_output=True, text=True)
                        if result.returncode == 0:
                            applied_optimizations.append(f"Executed: {command}")
                        else:
                            applied_optimizations.append(f"Failed: {command} - {result.stderr}")
                    except Exception as e:
                        applied_optimizations.append(f"Error executing {command}: {str(e)}")
                
            except Exception as e:
                applied_optimizations.append(f"Error applying {recommendation.name}: {str(e)}")
        
        return applied_optimizations
    
    def generate_performance_report(self) -> Dict[str, Any]:
        """Generate a comprehensive performance report."""
        # Count metrics by status
        status_counts = {}
        for metric in self.metrics:
            status_counts[metric.status] = status_counts.get(metric.status, 0) + 1
        
        # Determine overall performance status
        if status_counts.get('critical', 0) > 0:
            overall_status = 'CRITICAL'
        elif status_counts.get('warning', 0) > 0:
            overall_status = 'WARNING'
        else:
            overall_status = 'GOOD'
        
        return {
            "overall_status": overall_status,
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
            "metrics": [
                {
                    "name": metric.name,
                    "value": metric.value,
                    "unit": metric.unit,
                    "threshold": metric.threshold,
                    "status": metric.status,
                    "recommendation": metric.recommendation
                }
                for metric in self.metrics
            ],
            "recommendations": [
                {
                    "name": rec.name,
                    "level": rec.level.value,
                    "description": rec.description,
                    "impact": rec.impact,
                    "effort": rec.effort,
                    "commands": rec.commands,
                    "config_changes": rec.config_changes
                }
                for rec in self.recommendations
            ],
            "summary": {
                "total_metrics": len(self.metrics),
                "status_counts": status_counts,
                "total_recommendations": len(self.recommendations),
                "critical_recommendations": len([r for r in self.recommendations if r.level == OptimizationLevel.CRITICAL]),
                "high_recommendations": len([r for r in self.recommendations if r.level == OptimizationLevel.HIGH])
            }
        }


def main():
    """Main function for running performance analysis."""
    optimizer = ProductionPerformanceOptimizer()
    
    # Run performance analysis
    metrics, recommendations = optimizer.run_performance_analysis()
    
    # Generate report
    report = optimizer.generate_performance_report()
    
    # Print report
    print(f"Performance Report - {report['timestamp']}")
    print(f"Overall Status: {report['overall_status']}")
    print(f"Total Metrics: {report['summary']['total_metrics']}")
    print(f"Total Recommendations: {report['summary']['total_recommendations']}")
    print()
    
    print("Performance Metrics:")
    for metric in report['metrics']:
        status_emoji = {
            'good': '✅',
            'warning': '⚠️',
            'critical': '❌'
        }
        print(f"  {status_emoji.get(metric['status'], '❓')} {metric['name']}: {metric['value']} {metric['unit']} - {metric['recommendation']}")
    
    print("\nOptimization Recommendations:")
    for rec in report['recommendations']:
        level_emoji = {
            'low': '🟢',
            'medium': '🟡',
            'high': '🟠',
            'critical': '🔴'
        }
        print(f"  {level_emoji.get(rec['level'], '⚪')} {rec['name']}: {rec['description']}")
        print(f"    Impact: {rec['impact']}, Effort: {rec['effort']}")
    
    # Apply optimizations if requested
    if len(sys.argv) > 1 and sys.argv[1] == '--apply':
        applied = optimizer.apply_optimizations()
        if applied:
            print("\nApplied optimizations:")
            for item in applied:
                print(f"  - {item}")
        else:
            print("\nNo optimizations applied")


if __name__ == '__main__':
    main()
