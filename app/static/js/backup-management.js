/**
 * Backup Management Interface JavaScript
 *
 * Handles real-time updates, form validation, and API interactions
 * for the backup management interface.
 */

class BackupManager {
    constructor() {
        this.currentServerId = null;
        this.currentServerName = null;
        this.updateInterval = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupRealTimeUpdates();

        // Auto-load data if a server is pre-selected
        const serverSelect = document.getElementById('serverSelect');
        if (serverSelect.value) {
            this.loadServerBackupData();
        }
    }

    bindEvents() {
        // Server selection
        document.getElementById('serverSelect').addEventListener('change', () => {
            this.loadServerBackupData();
        });

        // Schedule form
        document.getElementById('scheduleForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSchedule();
        });

        // Delete schedule
        document.getElementById('deleteScheduleBtn').addEventListener('click', () => {
            this.confirmDeleteSchedule();
        });

        // Manual backup
        document.getElementById('triggerBackupBtn').addEventListener('click', () => {
            this.triggerManualBackup();
        });

        // Refresh history
        document.getElementById('refreshHistoryBtn').addEventListener('click', () => {
            this.loadBackupHistory();
        });

        // Restore functionality
        document.getElementById('restoreBackupSelect').addEventListener('change', () => {
            this.updateRestoreButtons();
        });

        document.getElementById('previewRestoreBtn').addEventListener('click', () => {
            this.previewRestore();
        });

        document.getElementById('confirmRestoreBtn').addEventListener('click', () => {
            this.confirmRestore();
        });

        document.getElementById('cancelRestoreBtn').addEventListener('click', () => {
            this.cancelRestore();
        });

        // Confirmation modal
        document.getElementById('confirmAction').addEventListener('click', () => {
            this.executeConfirmedAction();
        });
    }

    setupRealTimeUpdates() {
        // Update status every 30 seconds
        this.updateInterval = setInterval(() => {
            if (this.currentServerId) {
                this.updateScheduleStatus();
            }
        }, 30000);
    }

    loadServerBackupData() {
        const serverSelect = document.getElementById('serverSelect');
        const selectedOption = serverSelect.options[serverSelect.selectedIndex];

        if (!selectedOption.value) {
            this.hideAllSections();
            return;
        }

        this.currentServerId = parseInt(selectedOption.value);
        this.currentServerName = selectedOption.dataset.serverName;

        this.showLoadingOverlay();
        this.showAllSections();

        // Load all data for the selected server
        Promise.all([
            this.loadScheduleStatus(),
            this.loadBackupHistory(),
            this.loadAvailableBackups()
        ]).finally(() => {
            this.hideLoadingOverlay();
        });
    }

    async loadScheduleStatus() {
        try {
            const response = await fetch(`/api/backups/schedules/${this.currentServerId}`);
            const data = await response.json();

            if (data.success) {
                this.populateScheduleForm(data.schedule);
                this.updateScheduleStatusDisplay(data.schedule);
                this.showDeleteButton();
            } else if (response.status === 404) {
                this.clearScheduleForm();
                this.updateScheduleStatusDisplay(null);
                this.hideDeleteButton();
            } else {
                this.showError('Failed to load schedule: ' + data.error);
            }
        } catch (error) {
            this.showError('Error loading schedule: ' + error.message);
        }
    }

    async updateScheduleStatus() {
        try {
            const response = await fetch(`/api/backups/${this.currentServerId}/status`);
            const data = await response.json();

            if (data.success) {
                this.updateScheduleStatusDisplay(data.status);
            }
        } catch (error) {
            console.error('Error updating schedule status:', error);
        }
    }

    populateScheduleForm(schedule) {
        document.getElementById('scheduleType').value = schedule.schedule_type;
        document.getElementById('scheduleTime').value = schedule.schedule_time;
        document.getElementById('retentionDays').value = schedule.retention_days;
        document.getElementById('enabled').checked = schedule.enabled;
    }

    clearScheduleForm() {
        document.getElementById('scheduleType').value = 'daily';
        document.getElementById('scheduleTime').value = '02:00';
        document.getElementById('retentionDays').value = '30';
        document.getElementById('enabled').checked = true;
    }

    updateScheduleStatusDisplay(schedule) {
        const statusElement = document.getElementById('scheduleStatus');
        const statusIcon = statusElement.querySelector('.status-icon i');
        const statusText = statusElement.querySelector('.status-text');

        if (!schedule) {
            statusIcon.className = 'fas fa-circle text-muted';
            statusText.textContent = 'No schedule configured';
            return;
        }

        if (schedule.enabled) {
            statusIcon.className = 'fas fa-circle text-success';
            statusText.textContent = `Schedule active - ${schedule.schedule_type} at ${schedule.schedule_time}`;
        } else {
            statusIcon.className = 'fas fa-circle text-warning';
            statusText.textContent = 'Schedule disabled';
        }

        if (schedule.last_backup) {
            const lastBackup = new Date(schedule.last_backup);
            const timeAgo = this.getTimeAgo(lastBackup);
            statusText.textContent += ` | Last backup: ${timeAgo}`;
        }
    }

    async saveSchedule() {
        const formData = {
            server_id: this.currentServerId,
            schedule_type: document.getElementById('scheduleType').value,
            schedule_time: document.getElementById('scheduleTime').value,
            retention_days: parseInt(document.getElementById('retentionDays').value),
            enabled: document.getElementById('enabled').checked
        };

        try {
            this.showLoadingOverlay();

            // Check if schedule exists
            const checkResponse = await fetch(`/api/backups/schedules/${this.currentServerId}`);
            const checkData = await checkResponse.json();

            let response;
            if (checkData.success) {
                // Update existing schedule
                response = await fetch(`/api/backups/schedules/${this.currentServerId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
            } else {
                // Create new schedule
                response = await fetch('/api/backups/schedules', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
            }

            const data = await response.json();

            if (data.success) {
                this.showSuccess(data.message);
                this.loadScheduleStatus();
            } else {
                this.showError('Failed to save schedule: ' + data.error);
            }
        } catch (error) {
            this.showError('Error saving schedule: ' + error.message);
        } finally {
            this.hideLoadingOverlay();
        }
    }

    confirmDeleteSchedule() {
        this.showConfirmModal(
            'Delete Backup Schedule',
            `Are you sure you want to delete the backup schedule for ${this.currentServerName}?`,
            () => this.deleteSchedule()
        );
    }

    async deleteSchedule() {
        try {
            this.showLoadingOverlay();

            const response = await fetch(`/api/backups/schedules/${this.currentServerId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess(data.message);
                this.clearScheduleForm();
                this.updateScheduleStatusDisplay(null);
                this.hideDeleteButton();
            } else {
                this.showError('Failed to delete schedule: ' + data.error);
            }
        } catch (error) {
            this.showError('Error deleting schedule: ' + error.message);
        } finally {
            this.hideLoadingOverlay();
        }
    }

    async triggerManualBackup() {
        try {
            this.showLoadingOverlay();
            this.showBackupProgress();

            const response = await fetch(`/api/backups/${this.currentServerId}/trigger`, {
                method: 'POST'
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess(data.message);
                this.loadBackupHistory();
            } else {
                this.showError('Backup failed: ' + data.error);
            }
        } catch (error) {
            this.showError('Error triggering backup: ' + error.message);
        } finally {
            this.hideLoadingOverlay();
            this.hideBackupProgress();
        }
    }

    async loadBackupHistory() {
        try {
            const response = await fetch(`/api/backups/${this.currentServerId}/history`);
            const data = await response.json();

            if (data.success) {
                this.displayBackupHistory(data.backups);
            } else {
                this.showError('Failed to load backup history: ' + data.error);
            }
        } catch (error) {
            this.showError('Error loading backup history: ' + error.message);
        }
    }

    displayBackupHistory(backups) {
        const tbody = document.getElementById('backupHistoryBody');
        const noBackupsMessage = document.getElementById('noBackupsMessage');

        if (backups.length === 0) {
            tbody.innerHTML = '';
            noBackupsMessage.style.display = 'block';
            return;
        }

        noBackupsMessage.style.display = 'none';

        tbody.innerHTML = backups.map(backup => `
            <tr>
                <td>
                    <i class="fas fa-file-archive"></i>
                    ${backup.filename}
                </td>
                <td>${backup.size_mb} MB</td>
                <td>${new Date(backup.created).toLocaleString()}</td>
                <td>${backup.age_days} days ago</td>
                <td>
                    <button class="btn btn-sm btn-mc-secondary" onclick="backupManager.downloadBackup('${backup.filename}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </td>
            </tr>
        `).join('');
    }

    downloadBackup(filename) {
        // Create a temporary link to download the backup
        const link = document.createElement('a');
        link.href = `/backups/${this.currentServerName}/${filename}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async loadAvailableBackups() {
        try {
            const response = await fetch(`/api/backups/${this.currentServerId}/available`);
            const data = await response.json();

            if (data.success) {
                this.populateRestoreSelect(data.backups);
            } else {
                this.showError('Failed to load available backups: ' + data.error);
            }
        } catch (error) {
            this.showError('Error loading available backups: ' + error.message);
        }
    }

    populateRestoreSelect(backups) {
        const select = document.getElementById('restoreBackupSelect');
        select.innerHTML = '<option value="">-- Select a backup --</option>';

        backups.forEach(backup => {
            const option = document.createElement('option');
            option.value = backup.filename;
            option.textContent = `${backup.filename} (${backup.size_mb} MB, ${backup.age_days} days ago)`;
            option.disabled = !backup.can_restore;
            select.appendChild(option);
        });
    }

    updateRestoreButtons() {
        const select = document.getElementById('restoreBackupSelect');
        const previewBtn = document.getElementById('previewRestoreBtn');

        previewBtn.disabled = !select.value;
    }

    async previewRestore() {
        const select = document.getElementById('restoreBackupSelect');
        const backupFilename = select.value;

        if (!backupFilename) {
            this.showError('Please select a backup to restore');
            return;
        }

        try {
            this.showLoadingOverlay();

            const response = await fetch(`/api/backups/${this.currentServerId}/restore`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    backup_filename: backupFilename,
                    confirm: false
                })
            });

            const data = await response.json();

            if (data.success && data.preview) {
                this.displayRestorePreview(data);
            } else {
                this.showError('Failed to preview restore: ' + data.error);
            }
        } catch (error) {
            this.showError('Error previewing restore: ' + error.message);
        } finally {
            this.hideLoadingOverlay();
        }
    }

    displayRestorePreview(data) {
        const previewDiv = document.getElementById('restorePreview');
        const previewContent = document.getElementById('restorePreviewContent');
        const confirmBtn = document.getElementById('confirmRestoreBtn');
        const cancelBtn = document.getElementById('cancelRestoreBtn');
        const previewBtn = document.getElementById('previewRestoreBtn');

        previewContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <strong>Backup File:</strong> ${data.backup_info.filename}
                </div>
                <div class="col-md-6">
                    <strong>Size:</strong> ${data.backup_info.size_mb} MB
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-md-6">
                    <strong>Created:</strong> ${new Date(data.backup_info.created).toLocaleString()}
                </div>
                <div class="col-md-6">
                    <strong>Server:</strong> ${data.backup_info.server_name}
                </div>
            </div>
            <div class="alert alert-warning mt-3">
                <i class="fas fa-exclamation-triangle"></i>
                ${data.restore_warning}
            </div>
        `;

        previewDiv.style.display = 'block';
        confirmBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        previewBtn.style.display = 'none';
    }

    async confirmRestore() {
        const select = document.getElementById('restoreBackupSelect');
        const backupFilename = select.value;

        this.showConfirmModal(
            'Confirm Restore',
            `Are you sure you want to restore from backup "${backupFilename}"? This will replace all current server files.`,
            () => this.executeRestore(backupFilename)
        );
    }

    async executeRestore(backupFilename) {
        try {
            this.showLoadingOverlay();
            this.showRestoreProgress();

            const response = await fetch(`/api/backups/${this.currentServerId}/restore`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    backup_filename: backupFilename,
                    confirm: true
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess(data.message);
                this.resetRestoreInterface();
                this.loadBackupHistory(); // Refresh history
            } else {
                this.showError('Restore failed: ' + data.error);
            }
        } catch (error) {
            this.showError('Error executing restore: ' + error.message);
        } finally {
            this.hideLoadingOverlay();
            this.hideRestoreProgress();
        }
    }

    cancelRestore() {
        this.resetRestoreInterface();
    }

    resetRestoreInterface() {
        const previewDiv = document.getElementById('restorePreview');
        const confirmBtn = document.getElementById('confirmRestoreBtn');
        const cancelBtn = document.getElementById('cancelRestoreBtn');
        const previewBtn = document.getElementById('previewRestoreBtn');
        const select = document.getElementById('restoreBackupSelect');

        previewDiv.style.display = 'none';
        confirmBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        previewBtn.style.display = 'inline-block';
        select.value = '';
        this.updateRestoreButtons();
    }

    showRestoreProgress() {
        document.getElementById('restoreProgress').style.display = 'block';
    }

    hideRestoreProgress() {
        document.getElementById('restoreProgress').style.display = 'none';
    }

    showAllSections() {
        document.getElementById('scheduleSection').style.display = 'block';
        document.getElementById('manualBackupSection').style.display = 'block';
        document.getElementById('backupHistorySection').style.display = 'block';
        document.getElementById('backupRestoreSection').style.display = 'block';
    }

    hideAllSections() {
        document.getElementById('scheduleSection').style.display = 'none';
        document.getElementById('manualBackupSection').style.display = 'none';
        document.getElementById('backupHistorySection').style.display = 'none';
        document.getElementById('backupRestoreSection').style.display = 'none';
    }

    showDeleteButton() {
        document.getElementById('deleteScheduleBtn').style.display = 'inline-block';
    }

    hideDeleteButton() {
        document.getElementById('deleteScheduleBtn').style.display = 'none';
    }

    showBackupProgress() {
        document.getElementById('backupProgress').style.display = 'block';
    }

    hideBackupProgress() {
        document.getElementById('backupProgress').style.display = 'none';
    }

    showLoadingOverlay() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoadingOverlay() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    showConfirmModal(title, message, callback) {
        document.querySelector('#confirmModal .modal-title').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        this.confirmCallback = callback;
        $('#confirmModal').modal('show');
    }

    executeConfirmedAction() {
        if (this.confirmCallback) {
            this.confirmCallback();
            this.confirmCallback = null;
        }
        $('#confirmModal').modal('hide');
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showAlert(message, type) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="close" data-dismiss="alert">
                    <span>&times;</span>
                </button>
            </div>
        `;

        const statusUpdates = document.getElementById('statusUpdates');
        statusUpdates.insertAdjacentHTML('beforeend', alertHtml);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = statusUpdates.querySelector('.alert:last-child');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }
}

// Initialize backup manager when page loads
let backupManager;
document.addEventListener('DOMContentLoaded', () => {
    backupManager = new BackupManager();
});
