/**
 * Admin Configuration JavaScript
 * Handles experimental features toggles and real-time updates
 */

class ExperimentalFeaturesManager {
    constructor() {
        this.debounceTimeouts = new Map();
        this.debounceDelay = 500; // 500ms debounce
        this.init();
    }

    init() {
        this.bindEventListeners();
        this.loadInitialStates();
    }

    bindEventListeners() {
        // Bind to all experimental feature toggles
        const toggles = document.querySelectorAll('input[type="checkbox"][id^="server_management_page"]');

        toggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.handleToggleChange(e.target);
            });
        });
    }

    loadInitialStates() {
        // Load initial states from the server
        this.fetchFeatureStates();
    }

    async fetchFeatureStates() {
        try {
            const response = await fetch('/admin_config/experimental', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateUIStates(data.features || []);
            }
        } catch (error) {
            console.error('Error fetching feature states:', error);
            this.showError('Failed to load feature states');
        }
    }

    updateUIStates(features) {
        features.forEach(feature => {
            const toggle = document.getElementById(feature.feature_key);
            if (toggle) {
                toggle.checked = feature.enabled;
                this.updateToggleState(toggle, feature.enabled);
            }
        });
    }

    handleToggleChange(toggle) {
        const featureKey = toggle.id;
        const enabled = toggle.checked;

        // Show confirmation dialog for experimental features
        if (this.isExperimentalFeature(featureKey)) {
            if (!this.showConfirmationDialog(featureKey, enabled)) {
                // User cancelled, revert toggle
                toggle.checked = !enabled;
                return;
            }
        }

        // Debounce the API call
        this.debounceToggle(featureKey, enabled);
    }

    isExperimentalFeature(featureKey) {
        const experimentalFeatures = ['server_management_page'];
        return experimentalFeatures.includes(featureKey);
    }

    showConfirmationDialog(featureKey, enabled) {
        const featureNames = {
            'server_management_page': 'Server Management Page'
        };

        const action = enabled ? 'enable' : 'disable';
        const featureName = featureNames[featureKey] || featureKey;

        return confirm(
            `Are you sure you want to ${action} ${featureName}?\n\n` +
            `This is an experimental feature and may be unstable. ` +
            `Changes will take effect immediately.`
        );
    }

    debounceToggle(featureKey, enabled) {
        // Clear existing timeout for this feature
        if (this.debounceTimeouts.has(featureKey)) {
            clearTimeout(this.debounceTimeouts.get(featureKey));
        }

        // Set new timeout
        const timeoutId = setTimeout(() => {
            this.toggleFeature(featureKey, enabled);
            this.debounceTimeouts.delete(featureKey);
        }, this.debounceDelay);

        this.debounceTimeouts.set(featureKey, timeoutId);
    }

    async toggleFeature(featureKey, enabled) {
        const toggle = document.getElementById(featureKey);
        if (!toggle) return;

        // Show loading state
        this.setToggleLoading(toggle, true);

        try {
            const response = await fetch('/admin_config/experimental', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({
                    feature_key: featureKey,
                    enabled: enabled
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.updateToggleState(toggle, enabled);
                this.showSuccess(data.message);

                // Update other UI elements if needed
                this.updateFeatureDependentUI(featureKey, enabled);
            } else {
                throw new Error(data.error || 'Failed to toggle feature');
            }
        } catch (error) {
            console.error('Error toggling feature:', error);
            this.showError(`Failed to ${enabled ? 'enable' : 'disable'} feature: ${error.message}`);

            // Revert toggle state
            toggle.checked = !enabled;
            this.updateToggleState(toggle, !enabled);
        } finally {
            this.setToggleLoading(toggle, false);
        }
    }

    updateToggleState(toggle, enabled) {
        const label = toggle.nextElementSibling;
        if (label) {
            label.style.opacity = enabled ? '1' : '0.6';
        }

        // Update any status indicators
        const card = toggle.closest('.card');
        if (card) {
            const badge = card.querySelector('.badge');
            if (badge) {
                if (enabled) {
                    badge.textContent = 'Enabled';
                    badge.className = 'badge badge-success';
                } else {
                    badge.textContent = 'Disabled';
                    badge.className = 'badge badge-secondary';
                }
            }
        }
    }

    setToggleLoading(toggle, loading) {
        toggle.disabled = loading;
        const label = toggle.nextElementSibling;
        if (label) {
            if (loading) {
                label.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            } else {
                // Restore original label text
                const originalText = this.getOriginalLabelText(toggle.id);
                label.innerHTML = originalText;
            }
        }
    }

    getOriginalLabelText(featureKey) {
        const labels = {
            'server_management_page': 'Enable Server Management Page'
        };
        return labels[featureKey] || `Enable ${featureKey}`;
    }

    updateFeatureDependentUI(featureKey, enabled) {
        // Update UI elements that depend on feature states
        switch (featureKey) {
            case 'server_management_page':
                this.updateServerManagementUI(enabled);
                break;
        }
    }

    updateServerManagementUI(enabled) {
        // Update server management page related UI elements
        const serverManagementElements = document.querySelectorAll('[data-feature="server_management_page"]');
        serverManagementElements.forEach(el => {
            el.style.display = enabled ? 'block' : 'none';
        });
    }

    getCSRFToken() {
        const token = document.querySelector('input[name="csrf_token"]');
        return token ? token.value : '';
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed`;
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ExperimentalFeaturesManager();
});
