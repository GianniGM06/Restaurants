/* ===== CONFIGURATION & DATA STORAGE ===== */
class RestaurantManager {
    constructor() {
        this.data = {
            tested: JSON.parse(localStorage.getItem('testedRestaurants') || '[]'),
            wishlist: JSON.parse(localStorage.getItem('wishlistRestaurants') || '[]'),
            cuisineTypes: JSON.parse(localStorage.getItem('cuisineTypes') || JSON.stringify(this.getDefaultCuisineTypes()))
        };
        this.map = null;
        this.userLocation = null;
        this.editingId = null;
    }

    getDefaultCuisineTypes() {
        return [
            { value: 'français', label: '🥖 Français', emoji: '🥖' },
            { value: 'italien', label: '🍕 Italien', emoji: '🍕' },
            { value: 'asiatique', label: '🍜 Asiatique', emoji: '🍜' },
            { value: 'japonais', label: '🍣 Japonais', emoji: '🍣' },
            { value: 'indien', label: '🍛 Indien', emoji: '🍛' },
            { value: 'mexicain', label: '🌮 Mexicain', emoji: '🌮' },
            { value: 'libanais', label: '🥙 Libanais', emoji: '🥙' },
            { value: 'chinois', label: '🥢 Chinois', emoji: '🥢' },
            { value: 'thaï', label: '🌶️ Thaï', emoji: '🌶️' },
            { value: 'grec', label: '🫒 Grec', emoji: '🫒' }
        ];
    }

    saveData() {
        localStorage.setItem('testedRestaurants', JSON.stringify(this.data.tested));
        localStorage.setItem('wishlistRestaurants', JSON.stringify(this.data.wishlist));
        localStorage.setItem('cuisineTypes', JSON.stringify(this.data.cuisineTypes));
    }

    /* ===== CUISINE TYPES MANAGEMENT ===== */
    addCuisineType(cuisineInput) {
        const normalizedInput = cuisineInput.toLowerCase().trim();
        
        // Check if type already exists
        const exists = this.data.cuisineTypes.some(type => 
            type.value.toLowerCase() === normalizedInput
        );
        
        if (!exists && normalizedInput) {
            // Add new cuisine type
            const newType = {
                value: normalizedInput,
                label: `🍽️ ${cuisineInput}`,
                emoji: '🍽️'
            };
            
            this.data.cuisineTypes.push(newType);
            this.saveData();
            this.updateCuisineDropdown();
            
            return normalizedInput;
        }
        
        return normalizedInput;
    }

    updateCuisineDropdown() {
        const dropdown = document.getElementById('cuisineDropdown');
        if (!dropdown) return;
        
        dropdown.innerHTML = this.data.cuisineTypes
            .sort((a, b) => a.label.localeCompare(b.label))
            .map(type => 
                `<li><a class="dropdown-item" href="#" onclick="selectCuisine('${type.value}')">${type.label}</a></li>`
            ).join('');
    }

    /* ===== CALCULATIONS ===== */
    calculateFinalRating(ratings) {
        const weighted = (ratings.plats * 2 + ratings.vins * 1.5 + ratings.accueil * 1.5 + ratings.lieu * 1) / 6;
        return Math.round(weighted * 10) / 10;
    }

    calculateCountriesCount() {
        const allRestaurants = [...this.data.tested, ...this.data.wishlist];
        const countries = new Set();
        
        allRestaurants.forEach(restaurant => {
            const location = restaurant.location.toLowerCase();
            
            // Extract country from location
            if (location.includes('paris') || location.includes('france') || location.includes('ème arr')) {
                countries.add('France');
            } else if (location.includes('tokyo') || location.includes('japon')) {
                countries.add('Japon');
            } else if (location.includes('new york') || location.includes('usa') || location.includes('états-unis')) {
                countries.add('États-Unis');
            } else if (location.includes('london') || location.includes('londres') || location.includes('uk')) {
                countries.add('Royaume-Uni');
            } else if (location.includes('rome') || location.includes('milan') || location.includes('italie')) {
                countries.add('Italie');
            } else if (location.includes('barcelona') || location.includes('madrid') || location.includes('espagne')) {
                countries.add('Espagne');
            } else if (location.includes('berlin') || location.includes('munich') || location.includes('allemagne')) {
                countries.add('Allemagne');
            } else {
                // Try to extract country from location if it contains a recognizable pattern
                const locationParts = location.split(',').map(part => part.trim());
                if (locationParts.length > 1) {
                    countries.add(locationParts[locationParts.length - 1]);
                } else {
                    countries.add('Autre');
                }
            }
        });
        
        return countries.size;
    }

    /* ===== HTML GENERATION ===== */
    generateStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<i class="bi bi-star-fill"></i>';
            } else if (i - 0.5 <= rating) {
                stars += '<i class="bi bi-star-half"></i>';
            } else {
                stars += '<i class="bi bi-star"></i>';
            }
        }
        return stars;
    }

    getCuisineBadge(type) {
        const cuisineType = this.data.cuisineTypes.find(c => c.value === type);
        const badges = {
            'français': 'bg-primary',
            'italien': 'bg-success', 
            'asiatique': 'bg-danger',
            'japonais': 'bg-warning',
            'indien': 'bg-info',
            'mexicain': 'bg-dark',
            'libanais': 'bg-secondary',
            'chinois': 'bg-danger',
            'thaï': 'bg-warning',
            'grec': 'bg-info'
        };
        return badges[type] || 'bg-secondary';
    }

    createTestedCard(restaurant) {
        const finalRating = this.calculateFinalRating(restaurant.ratings);
        const photo = restaurant.photo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=250&fit=crop';
        
        return `
            <div class="col-md-6 mb-4">
                <div class="card restaurant-card h-100">
                    <img src="${photo}" class="card-img-top" alt="${restaurant.name}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${restaurant.name}</h5>
                            <span class="badge ${this.getCuisineBadge(restaurant.type)}">${restaurant.type}</span>
                        </div>
                        <p class="card-text text-muted">
                            <i class="bi bi-geo-alt"></i> ${restaurant.location}
                            <span class="ms-2">${restaurant.priceRange || '€€'}</span>
                        </p>
                        
                        <div class="rating-section">
                            <div class="row mb-2">
                                <div class="col-8"><small>🍽️ Plats (x2)</small></div>
                                <div class="col-4 text-end"><span class="stars">${this.generateStars(restaurant.ratings.plats)}</span></div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-8"><small>🍷 Vins (x1.5)</small></div>
                                <div class="col-4 text-end"><span class="stars">${this.generateStars(restaurant.ratings.vins)}</span></div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-8"><small>😊 Accueil (x1.5)</small></div>
                                <div class="col-4 text-end"><span class="stars">${this.generateStars(restaurant.ratings.accueil)}</span></div>
                            </div>
                            <div class="row">
                                <div class="col-8"><small>🏛️ Lieu (x1)</small></div>
                                <div class="col-4 text-end"><span class="stars">${this.generateStars(restaurant.ratings.lieu)}</span></div>
                            </div>
                        </div>

                        <div class="final-rating">
                            <strong>${finalRating}/5</strong> ${this.generateStars(finalRating)}
                        </div>

                        ${restaurant.comment ? `<blockquote class="blockquote-footer mt-3">"${restaurant.comment}"</blockquote>` : ''}

                        <div class="action-buttons">
                            <button class="btn btn-outline-primary btn-action" onclick="restaurantManager.editRestaurant('${restaurant.id}', 'tested')">
                                <i class="bi bi-pencil"></i> Modifier
                            </button>
                            <button class="btn btn-outline-danger btn-action" onclick="restaurantManager.deleteRestaurant('${restaurant.id}', 'tested')">
                                <i class="bi bi-trash"></i> Supprimer
                            </button>
                            ${restaurant.coordinates ? `
                            <button class="btn btn-outline-info btn-action" onclick="restaurantManager.showOnMap(${restaurant.coordinates.lat}, ${restaurant.coordinates.lng})">
                                <i class="bi bi-geo-alt"></i> Carte
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createWishlistCard(restaurant) {
        const photo = restaurant.photo || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=250&fit=crop';
        
        return `
            <div class="col-md-6 mb-4">
                <div class="card restaurant-card wishlist-card h-100">
                    <img src="${photo}" class="card-img-top" alt="${restaurant.name}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${restaurant.name}</h5>
                            <span class="badge ${this.getCuisineBadge(restaurant.type)}">${restaurant.type}</span>
                        </div>
                        <p class="card-text text-muted">
                            <i class="bi bi-geo-alt"></i> ${restaurant.location}
                            <span class="ms-2">${restaurant.priceRange || '€€'}</span>
                        </p>
                        ${restaurant.reason ? `
                        <div class="alert alert-success">
                            <strong>💡 Pourquoi :</strong><br>
                            ${restaurant.reason}
                        </div>
                        ` : ''}
                        ${restaurant.comment ? `<p class="text-muted"><em>"${restaurant.comment}"</em></p>` : ''}
                        
                        <div class="action-buttons">
                            <button class="btn btn-success btn-action" onclick="restaurantManager.openTransferModal('${restaurant.id}')">
                                <i class="bi bi-arrow-right"></i> Testé !
                            </button>
                            <button class="btn btn-outline-primary btn-action" onclick="restaurantManager.editRestaurant('${restaurant.id}', 'wishlist')">
                                <i class="bi bi-pencil"></i> Modifier
                            </button>
                            <button class="btn btn-outline-danger btn-action" onclick="restaurantManager.deleteRestaurant('${restaurant.id}', 'wishlist')">
                                <i class="bi bi-trash"></i> Supprimer
                            </button>
                            ${restaurant.coordinates ? `
                            <button class="btn btn-outline-info btn-action" onclick="restaurantManager.showOnMap(${restaurant.coordinates.lat}, ${restaurant.coordinates.lng})">
                                <i class="bi bi-geo-alt"></i> Carte
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createEmptyState(type) {
        const isWishlist = type === 'wishlist';
        return `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-${isWishlist ? 'heart' : 'star'}"></i>
                    <h4>Aucun restaurant ${isWishlist ? 'dans votre wishlist' : 'testé'}</h4>
                    <p class="text-muted">
                        ${isWishlist ? 'Commencez par ajouter des restaurants que vous aimeriez tester !' : 'Ajoutez vos premiers restaurants testés avec leurs notes !'}
                    </p>
                    <button class="btn btn-${isWishlist ? 'success' : 'primary'}" onclick="restaurantManager.openAddModal('${type}')">
                        <i class="bi bi-plus-lg"></i> ${isWishlist ? 'Ajouter une envie' : 'Ajouter un restaurant'}
                    </button>
                </div>
            </div>
        `;
    }

    /* ===== RENDERING ===== */
    renderSections() {
        const testedGrid = document.getElementById('tested-grid');
        const wishlistGrid = document.getElementById('wishlist-grid');

        // Render tested restaurants
        if (this.data.tested.length === 0) {
            testedGrid.innerHTML = this.createEmptyState('tested');
        } else {
            testedGrid.innerHTML = this.data.tested.map(r => this.createTestedCard(r)).join('');
        }

        // Render wishlist
        if (this.data.wishlist.length === 0) {
            wishlistGrid.innerHTML = this.createEmptyState('wishlist');
        } else {
            wishlistGrid.innerHTML = this.data.wishlist.map(r => this.createWishlistCard(r)).join('');
        }

        this.updateStats();
    }

    updateStats() {
        document.getElementById('tested-count').textContent = this.data.tested.length;
        document.getElementById('wishlist-count').textContent = this.data.wishlist.length;
        document.getElementById('countries-count').textContent = this.calculateCountriesCount();

        if (this.data.tested.length > 0) {
            const avgRating = this.data.tested.reduce((sum, r) => sum + this.calculateFinalRating(r.ratings), 0) / this.data.tested.length;
            document.getElementById('avg-rating').textContent = Math.round(avgRating * 10) / 10;
        } else {
            document.getElementById('avg-rating').textContent = '--';
        }
    }

    /* ===== MODAL MANAGEMENT ===== */
    openAddModal(type) {
        this.editingId = null;
        document.getElementById('modalTitle').textContent = type === 'tested' ? 'Ajouter un restaurant testé' : 'Ajouter à ma wishlist';
        document.getElementById('modalType').value = type;
        
        // Reset form
        document.getElementById('restaurantForm').reset();
        document.getElementById('editId').value = '';
        document.getElementById('cuisineInput').value = '';
        
        // Show/hide sections
        document.getElementById('ratingsSection').style.display = type === 'tested' ? 'block' : 'none';
        document.getElementById('wishlistSection').style.display = type === 'wishlist' ? 'block' : 'none';
        
        // Set default ratings
        if (type === 'tested') {
            this.setStarRating('plats', 5);
            this.setStarRating('vins', 5);
            this.setStarRating('accueil', 5);
            this.setStarRating('lieu', 5);
        }
        
        this.updateCuisineDropdown();
        new bootstrap.Modal(document.getElementById('restaurantModal')).show();
    }

    editRestaurant(id, type) {
        const restaurant = this.data[type].find(r => r.id === id);
        if (!restaurant) return;
        
        this.editingId = id;
        document.getElementById('modalTitle').textContent = 'Modifier ' + restaurant.name;
        document.getElementById('modalType').value = type;
        document.getElementById('editId').value = id;
        
        // Fill form
        document.getElementById('name').value = restaurant.name;
        document.getElementById('cuisineInput').value = restaurant.type;
        document.getElementById('location').value = restaurant.location;
        document.getElementById('address').value = restaurant.address || '';
        document.getElementById('photo').value = restaurant.photo || '';
        document.getElementById('priceRange').value = restaurant.priceRange || '€€';
        document.getElementById('comment').value = restaurant.comment || '';
        
        // Show/hide sections
        document.getElementById('ratingsSection').style.display = type === 'tested' ? 'block' : 'none';
        document.getElementById('wishlistSection').style.display = type === 'wishlist' ? 'block' : 'none';
        
        if (type === 'tested') {
            this.setStarRating('plats', restaurant.ratings.plats);
            this.setStarRating('vins', restaurant.ratings.vins);
            this.setStarRating('accueil', restaurant.ratings.accueil);
            this.setStarRating('lieu', restaurant.ratings.lieu);
        } else {
            document.getElementById('reason').value = restaurant.reason || '';
        }
        
        this.updateCuisineDropdown();
        new bootstrap.Modal(document.getElementById('restaurantModal')).show();
    }

    async saveRestaurant() {
        const form = document.getElementById('restaurantForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const type = document.getElementById('modalType').value;
        const isEdit = !!this.editingId;
        const cuisineInput = document.getElementById('cuisineInput').value;
        
        // Add cuisine type if it's new
        const cuisineType = this.addCuisineType(cuisineInput);
        
        const restaurantData = {
            id: this.editingId || Date.now().toString(),
            name: document.getElementById('name').value,
            type: cuisineType,
            location: document.getElementById('location').value,
            address: document.getElementById('address').value,
            photo: document.getElementById('photo').value,
            priceRange: document.getElementById('priceRange').value,
            comment: document.getElementById('comment').value,
            dateAdded: isEdit ? this.data[type].find(r => r.id === this.editingId).dateAdded : new Date().toISOString().split('T')[0]
        };

        // Geocoding
        if (restaurantData.address) {
            const coords = await this.geocodeAddress(restaurantData.address);
            if (coords) {
                restaurantData.coordinates = coords;
            }
        }

        if (type === 'tested') {
            restaurantData.ratings = {
                plats: parseInt(document.getElementById('platsRating').value),
                vins: parseInt(document.getElementById('vinsRating').value),
                accueil: parseInt(document.getElementById('accueilRating').value),
                lieu: parseInt(document.getElementById('lieuRating').value)
            };
            restaurantData.dateVisited = restaurantData.dateAdded;
        } else {
            restaurantData.reason = document.getElementById('reason').value;
        }

        if (isEdit) {
            const index = this.data[type].findIndex(r => r.id === this.editingId);
            this.data[type][index] = restaurantData;
        } else {
            this.data[type].push(restaurantData);
        }

        this.saveData();
        this.renderSections();
        bootstrap.Modal.getInstance(document.getElementById('restaurantModal')).hide();
        
        // Show success message
        this.showToast(isEdit ? 'Restaurant modifié !' : 'Restaurant ajouté !', 'success');
    }

    deleteRestaurant(id, type) {
        const restaurant = this.data[type].find(r => r.id === id);
        if (!restaurant) return;
        
        if (confirm(`Êtes-vous sûr de vouloir supprimer "${restaurant.name}" ?`)) {
            this.data[type] = this.data[type].filter(r => r.id !== id);
            this.saveData();
            this.renderSections();
            this.showToast('Restaurant supprimé !', 'success');
        }
    }

    openTransferModal(id) {
        const restaurant = this.data.wishlist.find(r => r.id === id);
        if (!restaurant) return;
        
        document.getElementById('transferId').value = id;
        document.getElementById('transferRestaurantName').textContent = restaurant.name;
        document.getElementById('transferComment').value = '';
        
        // Set default ratings
        this.setStarRating('transferPlats', 5);
        this.setStarRating('transferVins', 5);
        this.setStarRating('transferAccueil', 5);
        this.setStarRating('transferLieu', 5);
        
        new bootstrap.Modal(document.getElementById('transferModal')).show();
    }

    transferToTested() {
        const id = document.getElementById('transferId').value;
        const restaurant = this.data.wishlist.find(r => r.id === id);
        if (!restaurant) return;
        
        const testedRestaurant = {
            ...restaurant,
            ratings: {
                plats: parseInt(document.getElementById('transferPlatsRating').value),
                vins: parseInt(document.getElementById('transferVinsRating').value),
                accueil: parseInt(document.getElementById('transferAccueilRating').value),
                lieu: parseInt(document.getElementById('transferLieuRating').value)
            },
            comment: document.getElementById('transferComment').value,
            dateVisited: new Date().toISOString().split('T')[0]
        };
        
        // Remove reason (wishlist specific)
        delete testedRestaurant.reason;
        
        // Add to tested and remove from wishlist
        this.data.tested.push(testedRestaurant);
        this.data.wishlist = this.data.wishlist.filter(r => r.id !== id);
        
        this.saveData();
        this.renderSections();
        bootstrap.Modal.getInstance(document.getElementById('transferModal')).hide();
        
        // Switch to tested tab
        document.getElementById('tested-tab').click();
        this.showToast('Restaurant transféré dans "Testés" !', 'success');
    }

    /* ===== STAR RATING SYSTEM ===== */
    setupStarRatings() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('star')) {
                const rating = e.target.getAttribute('data-value');
                const ratingType = e.target.parentElement.getAttribute('data-rating');
                this.setStarRating(ratingType, rating);
            }
        });
    }

    setStarRating(type, value) {
        const container = document.querySelector(`[data-rating="${type}"]`);
        if (!container) return;
        
        const stars = container.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < value) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
        
        // Update hidden input
        const input = document.getElementById(type + 'Rating');
        if (input) input.value = value;
    }

    /* ===== GEOCODING ===== */
    async geocodeAddress(address) {
        try {
            const query = encodeURIComponent(address);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
        } catch (error) {
            console.warn('Geocoding failed for:', address, error);
        }
        
        return { lat: 48.8566, lng: 2.3522 }; // Default Paris
    }

    /* ===== MAP FUNCTIONALITY ===== */
    showOnMap(lat, lng) {
        document.querySelector('#map-tab').click();
        if (!this.map) {
            setTimeout(() => {
                this.initMap();
                setTimeout(() => this.map.setView([lat, lng], 16), 500);
            }, 100);
        } else {
            this.map.setView([lat, lng], 16);
        }
    }

    initMap() {
        this.map = L.map('map').setView([48.8566, 2.3522], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add tested restaurants
        this.data.tested.forEach(restaurant => {
            if (restaurant.coordinates) {
                const finalRating = this.calculateFinalRating(restaurant.ratings);
                const marker = L.marker([restaurant.coordinates.lat, restaurant.coordinates.lng]).addTo(this.map);

                marker.bindPopup(`
                    <div style="min-width: 200px;">
                        <h6><strong>${restaurant.name}</strong></h6>
                        <p class="mb-1"><span class="badge ${this.getCuisineBadge(restaurant.type)}">${restaurant.type}</span></p>
                        <p class="mb-2">${restaurant.location}</p>
                        <div>${this.generateStars(finalRating)} ${finalRating}/5</div>
                        ${restaurant.comment ? `<p class="small mt-2"><em>"${restaurant.comment}"</em></p>` : ''}
                    </div>
                `);
            }
        });

        // Add wishlist
        this.data.wishlist.forEach(restaurant => {
            if (restaurant.coordinates) {
                const marker = L.marker([restaurant.coordinates.lat, restaurant.coordinates.lng]).addTo(this.map);
                marker.bindPopup(`
                    <div style="min-width: 200px;">
                        <h6><strong>${restaurant.name}</strong></h6>
                        <p class="mb-1"><span class="badge ${this.getCuisineBadge(restaurant.type)}">${restaurant.type}</span></p>
                        <p class="mb-2">${restaurant.location}</p>
                        <div class="alert alert-info mb-0 py-2">
                            ❤️ <strong>À tester</strong><br>
                            ${restaurant.reason ? `<small>${restaurant.reason}</small>` : ''}
                        </div>
                    </div>
                `);
            }
        });
    }

    /* ===== UTILITY FUNCTIONS ===== */
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0 position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        document.body.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            document.body.removeChild(toast);
        });
    }

    getUserLocation() {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    this.showToast('Position détectée !', 'info');
                    // Add logic to find nearby restaurants
                },
                error => this.showToast("Impossible d'obtenir votre position.", 'warning')
            );
        }
    }

    /* ===== EXPORT FUNCTIONALITY ===== */
    exportData() {
        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                totalTested: this.data.tested.length,
                totalWishlist: this.data.wishlist.length,
                averageRating: this.data.tested.length > 0 ? 
                    (this.data.tested.reduce((sum, r) => sum + this.calculateFinalRating(r.ratings), 0) / this.data.tested.length).toFixed(1) : 0
            },
            tested: this.data.tested,
            wishlist: this.data.wishlist,
            cuisineTypes: this.data.cuisineTypes
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `carnet-gastro-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showToast('Données exportées avec succès !', 'success');
    }
}

/* ===== GLOBAL FUNCTIONS ===== */
let restaurantManager;

function openAddModal(type) {
    restaurantManager.openAddModal(type);
}

function saveRestaurant() {
    restaurantManager.saveRestaurant();
}

function transferToTested() {
    restaurantManager.transferToTested();
}

function selectCuisine(cuisine) {
    document.getElementById('cuisineInput').value = cuisine;
}

function exportData() {
    restaurantManager.exportData();
}

/* ===== INITIALIZATION ===== */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize restaurant manager
    restaurantManager = new RestaurantManager();
    
    // Render initial data
    restaurantManager.renderSections();
    restaurantManager.setupStarRatings();
    restaurantManager.updateCuisineDropdown();
    
    // Setup floating button
    document.getElementById('addFloatingBtn').addEventListener('click', function() {
        const activeTab = document.querySelector('.nav-link.active').id;
        const type = activeTab.includes('wishlist') ? 'wishlist' : 'tested';
        restaurantManager.openAddModal(type);
    });
    
    // Setup geolocation
    document.getElementById('findNearbyHero').addEventListener('click', () => {
        restaurantManager.getUserLocation();
    });

    // Initialize map when tab is first clicked
    document.getElementById('map-tab').addEventListener('shown.bs.tab', function() {
        if (!restaurantManager.map) {
            setTimeout(() => restaurantManager.initMap(), 100);
        }
    });

    // Setup cuisine input with dropdown functionality
    const cuisineInput = document.getElementById('cuisineInput');
    if (cuisineInput) {
        cuisineInput.addEventListener('input', function() {
            const value = this.value.toLowerCase();
            const dropdown = document.getElementById('cuisineDropdown');
            const items = dropdown.querySelectorAll('.dropdown-item');
            
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(value) ? 'block' : 'none';
            });
        });
    }

    // Welcome message for first time users
    if (restaurantManager.data.tested.length === 0 && restaurantManager.data.wishlist.length === 0) {
        setTimeout(() => {
            restaurantManager.showToast('Bienvenue ! Commencez par ajouter votre premier restaurant 🍽️', 'info');
        }, 1000);
    }
});
