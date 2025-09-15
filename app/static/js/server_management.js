/**
 * Server Management JavaScript Module
 *
 * Provides comprehensive functionality for the server management page including:
 * - Real-time log streaming with polling
 * - Command execution via API calls
 * - Auto-scroll management with manual override
 * - Log filtering by level (INFO/WARN/ERROR)
 * - Error handling and user feedback
 * - Command history storage and retrieval
 * - Server status updates
 */

class ServerManagement {
    constructor() {
        this.serverId = null;
        this.logPollingInterval = null;
        this.statusPollingInterval = null;
        this.commandHistory = [];
        this.autoScroll = true;
        this.logFilter = 'all'; // 'all', 'info', 'warn', 'error'
        this.isPolling = false;
        this.csrfToken = null;

        this.init();
    }

    init() {
        // Get CSRF token
        const csrfTokenElement = document.getElementById('csrf-token');
        if (csrfTokenElement) {
            this.csrfToken = csrfTokenElement.value;
        }

        // Get server ID from the first element that has data-server-id
        const serverElement = document.querySelector('[data-server-id]');
        if (serverElement) {
            this.serverId = parseInt(serverElement.dataset.serverId);
        }

        if (!this.serverId) {
            console.error('Server ID not found');
            return;
        }

        this.bindEventListeners();
        this.loadCommandHistory();
        this.startLogPolling();
        this.startStatusPolling();
        this.initializeConsole();
    }

    bindEventListeners() {
        // Server control buttons
        document.querySelectorAll('.server-control-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleServerControl(action);
            });
        });

        // Copy server link
        document.querySelectorAll('.copy-link-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.copyServerLink();
            });
        });

        // Delete server
        document.querySelectorAll('.delete-server-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.confirmDeleteServer();
            });
        });

        // Console controls
        document.querySelectorAll('.refresh-console-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.refreshConsole();
            });
        });

        document.querySelectorAll('.clear-console-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.clearConsole();
            });
        });

        document.querySelectorAll('.download-logs-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.downloadLogs();
            });
        });

        // Command buttons
        document.querySelectorAll('.command-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const command = e.target.dataset.command;
                this.executeCommand(command);
            });
        });

        // Custom command input
        document.querySelectorAll('.execute-command-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById('custom-command-input');
                if (input && input.value.trim()) {
                    this.executeCommand(input.value.trim());
                    input.value = '';
                }
            });
        });

        // Enter key for custom command
        const customInput = document.getElementById('custom-command-input');
        if (customInput) {
            customInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (customInput.value.trim()) {
                        this.executeCommand(customInput.value.trim());
                        customInput.value = '';
                    }
                }
            });
        }

        // Console scroll detection
        const consoleOutput = document.getElementById('console-output');
        if (consoleOutput) {
            consoleOutput.addEventListener('scroll', () => {
                this.handleConsoleScroll();
            });
        }
    }

    // Real-time log streaming using polling (every 2-3 seconds)
    startLogPolling() {
        if (this.isPolling) return;

        this.isPolling = true;
        this.logPollingInterval = setInterval(() => {
            this.fetchServerLogs();
        }, 2500); // Poll every 2.5 seconds

        // Initial fetch
        this.fetchServerLogs();
    }

    stopLogPolling() {
        if (this.logPollingInterval) {
            clearInterval(this.logPollingInterval);
            this.logPollingInterval = null;
        }
        this.isPolling = false;
    }

    async fetchServerLogs() {
        try {
            const response = await fetch(`/api/console/${this.serverId}/logs?limit=50`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.updateConsoleOutput(data.logs);
            } else {
                console.error('Failed to fetch logs:', data.error);
            }
        } catch (error) {
            console.error('Error fetching server logs:', error);
            this.showError('Failed to fetch server logs');
        }
    }

    updateConsoleOutput(logs) {
        const consoleOutput = document.getElementById('console-output');
        if (!consoleOutput) return;

        const wasAtBottom = this.isScrolledToBottom(consoleOutput);
        const currentContent = consoleOutput.innerHTML;

        // Filter logs based on current filter
        const filteredLogs = this.filterLogs(logs);

        // Update console content
        consoleOutput.innerHTML = filteredLogs.map(log => {
            const timestamp = log.timestamp || new Date().toLocaleTimeString();
            const levelClass = this.getLogLevelClass(log.level);
            return `
                <div class="console-line ${levelClass}">
                    <span class="console-timestamp">[${timestamp}]</span>
                    <span class="console-level">[${log.level.toUpperCase()}]</span>
                    <span class="console-message">${this.escapeHtml(log.message)}</span>
                </div>
            `;
        }).join('');

        // Auto-scroll if user was at bottom or auto-scroll is enabled
        if (wasAtBottom || this.autoScroll) {
            this.scrollToBottom(consoleOutput);
        }
    }

    filterLogs(logs) {
        if (this.logFilter === 'all') {
            return logs;
        }
        return logs.filter(log => log.level.toLowerCase() === this.logFilter);
    }

    getLogLevelClass(level) {
        const levelMap = {
            'info': 'log-info',
            'warn': 'log-warn',
            'error': 'log-error',
            'debug': 'log-debug'
        };
        return levelMap[level.toLowerCase()] || 'log-info';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Auto-scroll management with manual override
    isScrolledToBottom(element) {
        return element.scrollTop + element.clientHeight >= element.scrollHeight - 10;
    }

    scrollToBottom(element) {
        element.scrollTop = element.scrollHeight;
    }

    handleConsoleScroll() {
        const consoleOutput = document.getElementById('console-output');
        if (!consoleOutput) return;

        // Disable auto-scroll if user scrolls up
        if (!this.isScrolledToBottom(consoleOutput)) {
            this.autoScroll = false;
        } else {
            this.autoScroll = true;
        }
    }

    // Command execution via API calls
    async executeCommand(command) {
        if (!command || !command.trim()) {
            this.showError('Please enter a command');
            return;
        }

        // Add to command history
        this.addToCommandHistory(command);

        try {
            const response = await fetch(`/api/console/${this.serverId}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.csrfToken
                },
                credentials: 'same-origin',
                body: JSON.stringify({ command: command })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.showSuccess(`Command executed: ${command}`);
                // Refresh logs to show command output
                setTimeout(() => this.fetchServerLogs(), 1000);
            } else {
                this.showError(`Command failed: ${data.error}`);
            }
        } catch (error) {
            console.error('Error executing command:', error);
            this.showError(`Failed to execute command: ${error.message}`);
        }
    }

    // Command history storage and retrieval
    addToCommandHistory(command) {
        const timestamp = new Date().toLocaleTimeString();
        const historyItem = {
            command: command,
            timestamp: timestamp
        };

        // Add to beginning of array
        this.commandHistory.unshift(historyItem);

        // Keep only last 50 commands
        if (this.commandHistory.length > 50) {
            this.commandHistory = this.commandHistory.slice(0, 50);
        }

        this.saveCommandHistory();
        this.updateCommandHistoryDisplay();
    }

    saveCommandHistory() {
        try {
            localStorage.setItem(`server_${this.serverId}_command_history`, JSON.stringify(this.commandHistory));
        } catch (error) {
            console.error('Failed to save command history:', error);
        }
    }

    loadCommandHistory() {
        try {
            const saved = localStorage.getItem(`server_${this.serverId}_command_history`);
            if (saved) {
                this.commandHistory = JSON.parse(saved);
                this.updateCommandHistoryDisplay();
            }
        } catch (error) {
            console.error('Failed to load command history:', error);
            this.commandHistory = [];
        }
    }

    updateCommandHistoryDisplay() {
        const historyContainer = document.getElementById('command-history');
        if (!historyContainer) return;

        if (this.commandHistory.length === 0) {
            historyContainer.innerHTML = `
                <div class="history-item">
                    <span class="history-timestamp">[${new Date().toLocaleTimeString()}]</span>
                    <span class="history-command">No commands executed yet</span>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = this.commandHistory.map(item => `
            <div class="history-item" onclick="serverManagement.executeCommandFromHistory('${this.escapeHtml(item.command)}')">
                <span class="history-timestamp">[${item.timestamp}]</span>
                <span class="history-command">${this.escapeHtml(item.command)}</span>
            </div>
        `).join('');
    }

    executeCommandFromHistory(command) {
        const input = document.getElementById('custom-command-input');
        if (input) {
            input.value = command;
        }
    }

    // Server status updates
    startStatusPolling() {
        this.statusPollingInterval = setInterval(() => {
            this.updateServerStatus();
        }, 5000); // Update every 5 seconds

        // Initial update
        this.updateServerStatus();
    }

    stopStatusPolling() {
        if (this.statusPollingInterval) {
            clearInterval(this.statusPollingInterval);
            this.statusPollingInterval = null;
        }
    }

    async updateServerStatus() {
        // Show loading state
        this.showStatusLoading();

        try {
            const response = await fetch(`/api/console/${this.serverId}/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.updateStatusDisplay(data.status);
                this.hideStatusError();
            } else {
                console.error('Failed to fetch server status:', data.error);
                this.showStatusError(`Failed to fetch status: ${data.error}`);
            }
        } catch (error) {
            console.error('Error fetching server status:', error);
            this.showStatusError(`Connection error: ${error.message}`);
        }
    }

    showStatusLoading() {
        const memoryUsage = document.getElementById('memory-usage');
        const cpuUsage = document.getElementById('cpu-usage');
        const playerCount = document.getElementById('player-count');

        if (memoryUsage) memoryUsage.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        if (cpuUsage) cpuUsage.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        if (playerCount) playerCount.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    }

    showStatusError(message) {
        const memoryUsage = document.getElementById('memory-usage');
        const cpuUsage = document.getElementById('cpu-usage');
        const playerCount = document.getElementById('player-count');

        if (memoryUsage) {
            memoryUsage.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> Error';
            memoryUsage.className = 'metric-value error-state';
        }
        if (cpuUsage) {
            cpuUsage.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> Error';
            cpuUsage.className = 'metric-value error-state';
        }
        if (playerCount) {
            playerCount.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> Error';
            playerCount.className = 'metric-value error-state';
        }

        // Show error notification
        this.showError(`Status update failed: ${message}`);
    }

    hideStatusError() {
        // Remove error states if they exist
        const errorElements = document.querySelectorAll('.metric-value.error-state');
        errorElements.forEach(el => {
            el.classList.remove('error-state');
        });
    }

    updateStatusDisplay(status) {
        // Update status badge
        const statusBadge = document.querySelector('.badge');
        if (statusBadge) {
            statusBadge.textContent = status.status;
            statusBadge.className = `badge badge-${status.status === 'Running' ? 'success' : 'secondary'}`;
        }

        // Update control buttons
        const controlBtn = document.querySelector('.server-control-btn');
        if (controlBtn) {
            const isRunning = status.status === 'Running';
            controlBtn.dataset.action = isRunning ? 'stop' : 'start';
            controlBtn.className = `btn btn-${isRunning ? 'danger' : 'success'} server-control-btn`;
            controlBtn.innerHTML = `
                <i class="fas fa-${isRunning ? 'stop' : 'play'}"></i>
                ${isRunning ? 'Stop Server' : 'Start Server'}
            `;
        }

        // Update real-time status indicators
        this.updateRealTimeStatus(status);
    }

    updateRealTimeStatus(status) {
        // Create or update real-time status section
        let statusSection = document.getElementById('realtime-status');
        if (!statusSection) {
            // Find the server information card and add real-time status section
            const serverInfoCard = document.querySelector('.card.mc-card');
            if (serverInfoCard) {
                const statusHtml = `
                    <div class="card mc-card" id="realtime-status">
                        <div class="card-header">
                            <h3 class="pixel-font">
                                <i class="fas fa-chart-line"></i> Real-Time Status
                                <span class="status-indicator" id="status-indicator">
                                    <i class="fas fa-circle"></i>
                                </span>
                            </h3>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3">
                                    <div class="status-metric">
                                        <div class="metric-label">Status</div>
                                        <div class="metric-value" id="status-value">${status.status}</div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="status-metric">
                                        <div class="metric-label">Memory Usage</div>
                                        <div class="metric-value" id="memory-usage">Loading...</div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="status-metric">
                                        <div class="metric-label">CPU Usage</div>
                                        <div class="metric-value" id="cpu-usage">Loading...</div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="status-metric">
                                        <div class="metric-label">Players</div>
                                        <div class="metric-value" id="player-count">N/A</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                serverInfoCard.insertAdjacentHTML('afterend', statusHtml);
                statusSection = document.getElementById('realtime-status');
            }
        }

        if (statusSection) {
            // Update status value
            const statusValue = document.getElementById('status-value');
            if (statusValue) {
                statusValue.textContent = status.status;
            }

            // Update status indicator
            const statusIndicator = document.getElementById('status-indicator');
            if (statusIndicator) {
                const isRunning = status.status === 'Running';
                statusIndicator.className = `status-indicator ${isRunning ? 'running' : 'stopped'}`;
                statusIndicator.innerHTML = `<i class="fas fa-circle"></i>`;
            }

            // Update memory usage if process info is available
            const memoryUsage = document.getElementById('memory-usage');
            if (memoryUsage && status.process_info && status.process_info.memory_info) {
                const memoryMB = Math.round(status.process_info.memory_info.rss / 1024 / 1024);
                const allocatedMB = status.memory_mb || 0;
                const percentage = allocatedMB > 0 ? Math.round((memoryMB / allocatedMB) * 100) : 0;

                memoryUsage.innerHTML = `
                    <span class="memory-usage">${memoryMB}MB</span>
                    <small class="memory-percentage">(${percentage}%)</small>
                `;

                // Add visual indicator based on usage
                memoryUsage.className = `metric-value ${percentage > 90 ? 'high-usage' : percentage > 70 ? 'medium-usage' : 'normal-usage'}`;
            } else if (memoryUsage) {
                memoryUsage.textContent = 'N/A';
                memoryUsage.className = 'metric-value';
            }

            // Update CPU usage if process info is available
            const cpuUsage = document.getElementById('cpu-usage');
            if (cpuUsage && status.process_info && status.process_info.cpu_percent !== undefined) {
                const cpuPercent = Math.round(status.process_info.cpu_percent);
                cpuUsage.innerHTML = `<span class="cpu-usage">${cpuPercent}%</span>`;

                // Add visual indicator based on usage
                cpuUsage.className = `metric-value ${cpuPercent > 80 ? 'high-usage' : cpuPercent > 50 ? 'medium-usage' : 'normal-usage'}`;
            } else if (cpuUsage) {
                cpuUsage.textContent = 'N/A';
                cpuUsage.className = 'metric-value';
            }

            // Update player count (placeholder for now - would need server query)
            const playerCount = document.getElementById('player-count');
            if (playerCount) {
                // For now, show N/A - this would require querying the server for player count
                playerCount.textContent = 'N/A';
                playerCount.className = 'metric-value';
            }
        }
    }

    // Error handling and user feedback
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'danger');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';

        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
            ${message}
            <button type="button" class="close" data-dismiss="alert">
                <span>&times;</span>
            </button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Server control handlers
    async handleServerControl(action) {
        const url = action === 'start' ?
            `/server/start/${this.serverId}` :
            `/server/stop/${this.serverId}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.csrfToken
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                this.showSuccess(`Server ${action} command sent`);
                // Update status after a delay
                setTimeout(() => this.updateServerStatus(), 2000);
            } else {
                this.showError(`Failed to ${action} server`);
            }
        } catch (error) {
            console.error(`Error ${action}ing server:`, error);
            this.showError(`Failed to ${action} server: ${error.message}`);
        }
    }

    copyServerLink() {
        const serverLink = `${window.location.origin}/server/manage/${this.serverId}`;
        navigator.clipboard.writeText(serverLink).then(() => {
            this.showSuccess('Server link copied to clipboard');
        }).catch(() => {
            this.showError('Failed to copy server link');
        });
    }

    confirmDeleteServer() {
        if (confirm('Are you sure you want to delete this server? This action cannot be undone.')) {
            window.location.href = `/server/delete/${this.serverId}`;
        }
    }

    // Console utility methods
    refreshConsole() {
        this.fetchServerLogs();
        this.showSuccess('Console refreshed');
    }

    clearConsole() {
        const consoleOutput = document.getElementById('console-output');
        if (consoleOutput) {
            consoleOutput.innerHTML = `
                <div class="console-line">
                    <span class="console-timestamp">[${new Date().toLocaleTimeString()}]</span>
                    <span class="console-message">Console cleared</span>
                </div>
            `;
        }
        this.showSuccess('Console cleared');
    }

    downloadLogs() {
        window.open(`/api/console/${this.serverId}/logs?download=true`, '_blank');
    }

    initializeConsole() {
        const consoleOutput = document.getElementById('console-output');
        if (consoleOutput) {
            // Add initial message
            consoleOutput.innerHTML = `
                <div class="console-line">
                    <span class="console-timestamp">[${new Date().toLocaleTimeString()}]</span>
                    <span class="console-message">Server management console initialized</span>
                </div>
            `;
            this.scrollToBottom(consoleOutput);
        }
    }

    // Cleanup method
    destroy() {
        this.stopLogPolling();
        this.stopStatusPolling();
    }
}

// Initialize server management when DOM is loaded
let serverManagement;
document.addEventListener('DOMContentLoaded', () => {
    serverManagement = new ServerManagement();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (serverManagement) {
        serverManagement.destroy();
    }
});

// Make serverManagement globally accessible for HTML onclick handlers
window.serverManagement = serverManagement;
