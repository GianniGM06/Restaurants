/* ===== APPLICATION RESTAURANT SIMPLIFIÉE ===== */

class SimpleRestaurantApp {
    constructor() {
        // Configuration GitHub
        this.config = {
            owner: 'giannigm06', // Votre nom d'utilisateur GitHub
            repo: 'Restaurants_data', // Nom de votre repository
            fileName: 'restaurants.json',
            branch: 'main'
        };
        
        // État de l'application
        this.data = {
            tested: [],
            wishlist: [],
            cuisineTypes: []
        };
        
        this.githubToken = localStorage.getItem('github_token');
        this.isEditMode = !!this.githubToken;
        this.map = null;
        this.fileSha = null; // Pour les mises à jour GitHub
        
        console.log('🚀 Application initialisée');
        console.log('📝 Mode édition:', this.isEditMode);
    }

    /* ===== CHARGEMENT INITIAL ===== */
    async init() {
        console.log('🚀 Début initialisation...');
        
        try {
            // Toujours configurer l'UI d'abord
            this.setupUI();
            console.log('✅ UI configurée');
            
            // Essayer de charger les données
            await this.loadData();
            console.log('✅ Données chargées');
            
            this.render();
            console.log('✅ Rendu effectué');
            
            this.showToast('✅ Application prête !', 'success');
            
        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            
            // En cas d'erreur, utiliser les données par défaut et continuer
            this.data = {
                tested: this.getDefaultTestedData(),
                wishlist: this.getDefaultWishlistData(),
                cuisineTypes: this.getDefaultCuisineTypes()
            };
            
            this.render();
            this.showToast('⚠️ Données par défaut chargées', 'warning');
        }
        
        // Mettre à jour le statut final
        this.updateSyncStatus();
    }

    /* ===== CHARGEMENT DES DONNÉES ===== */
    async loadData() {
        console.log('📖 Début chargement des données...');
        console.log('🔧 Configuration:', this.config);
        
        try {
            let jsonData;
            
            // Si on a un token GitHub, utiliser l'API (immédiatement à jour)
            if (this.githubToken) {
                console.log('🔑 Chargement via API GitHub (immédiat)...');
                jsonData = await this.loadFromAPI();
            } else {
                console.log('🌐 Chargement via raw.githubusercontent.com (peut avoir du délai)...');
                jsonData = await this.loadFromRaw();
            }
            
            console.log('✅ JSON parsé avec succès');
            console.log('📊 Données trouvées:', {
                tested: jsonData.tested?.length || 0,
                wishlist: jsonData.wishlist?.length || 0,
                cuisineTypes: Object.keys(jsonData.cuisineTypes || {}).length,
                lastUpdated: jsonData.metadata?.lastUpdated || 'Non défini'
            });
            
            // Si on est en mode édition, récupérer aussi le SHA pour les mises à jour
            if (this.isEditMode) {
                await this.getFileSha();
            }
            
            // Parser les données
            this.data = {
                tested: jsonData.tested || [],
                wishlist: jsonData.wishlist || [],
                cuisineTypes: this.parseCuisineTypes(jsonData.cuisineTypes || {})
            };
            
            console.log('📊 Données finales parsées:', {
                tested: this.data.tested.length,
                wishlist: this.data.wishlist.length,
                cuisines: this.data.cuisineTypes.length
            });
            
            // Afficher la date de dernière mise à jour si disponible
            if (jsonData.metadata?.lastUpdated) {
                const lastUpdate = new Date(jsonData.metadata.lastUpdated);
                console.log('🕒 Dernière mise à jour:', lastUpdate.toLocaleString());
                this.showToast(`📅 Données du ${lastUpdate.toLocaleString()}`, 'info');
            }
            
        } catch (error) {
            console.warn('⚠️ Erreur chargement GitHub:', error.message);
            console.warn('🔄 Utilisation des données par défaut');
            
            // Utiliser les données par défaut
            this.data = {
                tested: this.getDefaultTestedData(),
                wishlist: this.getDefaultWishlistData(),
                cuisineTypes: this.getDefaultCuisineTypes()
            };
            
            console.log('📊 Données par défaut chargées:', {
                tested: this.data.tested.length,
                wishlist: this.data.wishlist.length,
                cuisines: this.data.cuisineTypes.length
            });
            
            // Re-lancer l'erreur pour que l'appelant sache qu'il y a eu un problème
            throw error;
        }
    }

    /* ===== CHARGEMENT VIA API GITHUB (IMMÉDIAT) ===== */
    async loadFromAPI() {
        const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.fileName}`;
        console.log('🔗 URL API GitHub:', url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${this.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
                // Pas de Cache-Control pour éviter CORS
            }
        });
        
        console.log('📨 Réponse API status:', response.status);
        
        if (!response.ok) {
            throw new Error(`GitHub API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Décoder le contenu base64
        const content = atob(data.content.replace(/\s/g, ''));
        console.log('📄 Contenu décodé (début):', content.substring(0, 200) + '...');
        
        return JSON.parse(content);
    }

    /* ===== CHARGEMENT VIA RAW (AVEC CACHE) ===== */
    async loadFromRaw() {
        // Fallback pour les utilisateurs sans token
        const cacheBuster = Math.floor(Date.now() / 1000);
        const url = `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/${this.config.branch}/${this.config.fileName}?_=${cacheBuster}`;
        console.log('🔗 URL raw GitHub:', url);
        
        const response = await fetch(url);
        console.log('📨 Réponse raw status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        console.log('📄 Texte raw (début):', text.substring(0, 200) + '...');
        
        return JSON.parse(text);
    }

    /* ===== RÉCUPÉRATION DU SHA (pour les mises à jour) ===== */
    async getFileSha() {
        if (!this.githubToken) {
            console.log('⚠️ Pas de token GitHub pour récupérer le SHA');
            return;
        }
        
        try {
            const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.fileName}`;
            console.log('🔍 Récupération SHA depuis:', url);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            console.log('📨 Réponse SHA status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                this.fileSha = data.sha;
                console.log('🔑 SHA récupéré avec succès:', this.fileSha);
            } else {
                const errorData = await response.json();
                console.warn('⚠️ Erreur récupération SHA:', response.status, errorData);
                if (response.status === 404) {
                    console.log('📄 Fichier n\'existe pas encore - sera créé');
                    this.fileSha = null;
                }
            }
        } catch (error) {
            console.warn('⚠️ Erreur réseau récupération SHA:', error);
            this.fileSha = null;
        }
    }

    /* ===== CONFIGURATION UI ===== */
    setupUI() {
        console.log('🔧 Configuration UI...');
        
        // Mise à jour du statut selon le mode
        this.updateSyncStatus();

        // Mise à jour de l'indicateur dans la hero section
        const modeIndicator = document.getElementById('mode-indicator');
        if (modeIndicator) {
            if (this.isEditMode) {
                modeIndicator.className = 'alert alert-success d-inline-block';
                modeIndicator.innerHTML = `
                    <i class="bi bi-pencil-fill"></i>
                    <strong>Mode édition activé :</strong> Vous pouvez ajouter et modifier des restaurants !
                    <br><small>⚡ Données immédiatement à jour grâce à l'API GitHub</small>
                `;
            } else {
                modeIndicator.className = 'alert alert-info d-inline-block';
                modeIndicator.innerHTML = `
                    <i class="bi bi-eye-fill"></i>
                    <strong>Mode lecture seule</strong><br>
                    <small>⚠️ Délai possible (2-10min) - Connectez-vous pour des données immédiates</small>
                `;
            }
        }

        // Afficher/masquer les boutons d'édition
        const editElements = document.querySelectorAll('.edit-only');
        editElements.forEach(el => {
            el.style.display = this.isEditMode ? 'block' : 'none';
        });

        // Configuration des événements
        this.setupEventListeners();
    }

    /* ===== MISE À JOUR DU STATUT ===== */
    updateSyncStatus(customStatus = null) {
        const statusBadge = document.getElementById('status-badge');
        if (statusBadge) {
            if (customStatus) {
                // Statut temporaire personnalisé
                statusBadge.className = 'badge bg-warning fs-6';
                statusBadge.textContent = customStatus;
            } else if (this.isEditMode) {
                statusBadge.className = 'badge bg-success fs-6';
                statusBadge.textContent = '✏️ Mode édition';
            } else {
                statusBadge.className = 'badge bg-info fs-6';
                statusBadge.textContent = '👁️ Mode lecture';
            }
        }
    }

    setupEventListeners() {
        console.log('🔧 Configuration des event listeners...');
        
        try {
            // Bouton configuration GitHub
            const githubBtn = document.getElementById('github-config');
            if (githubBtn) {
                githubBtn.onclick = () => this.setupGitHub();
            }

            // Boutons synchronisation/sauvegarde
            const syncBtn = document.getElementById('sync-btn');
            if (syncBtn) {
                syncBtn.onclick = () => this.manualSync();
                // Mettre à jour le texte selon le mode
                if (this.isEditMode) {
                    syncBtn.innerHTML = '<i class="bi bi-cloud-upload"></i> Sauvegarder';
                    syncBtn.title = 'Sauvegarder vers GitHub';
                } else {
                    syncBtn.innerHTML = '<i class="bi bi-cloud-download"></i> Recharger';
                    syncBtn.title = 'Recharger depuis GitHub';
                }
            }

            const syncBtnHero = document.getElementById('sync-btn-hero');
            if (syncBtnHero) {
                syncBtnHero.onclick = () => this.manualSync();
                // Mettre à jour le texte selon le mode
                if (this.isEditMode) {
                    syncBtnHero.innerHTML = '<i class="bi bi-cloud-upload"></i> Sauvegarder';
                } else {
                    syncBtnHero.innerHTML = '<i class="bi bi-cloud-download"></i> Recharger';
                }
            }

            // Bouton test GitHub (ajouté dynamiquement au menu)
            this.addTestGitHubButton();

            // Boutons d'ajout
            const addTestedBtn = document.getElementById('add-tested');
            if (addTestedBtn) {
                addTestedBtn.onclick = () => this.openAddModal('tested');
            }

            const addWishlistBtn = document.getElementById('add-wishlist');
            if (addWishlistBtn) {
                addWishlistBtn.onclick = () => this.openAddModal('wishlist');
            }

            // Bouton flottant
            const floatingBtn = document.getElementById('floating-add-btn');
            if (floatingBtn) {
                floatingBtn.onclick = () => {
                    const activeTab = document.querySelector('.nav-link.active');
                    const type = (activeTab && activeTab.id.includes('wishlist')) ? 'wishlist' : 'tested';
                    this.openAddModal(type);
                };
            }

            // Onglet carte
            const mapTab = document.getElementById('map-tab');
            if (mapTab) {
                mapTab.addEventListener('shown.bs.tab', () => {
                    setTimeout(() => this.initMap(), 100);
                });
            }

            console.log('✅ Event listeners configurés');
            
        } catch (error) {
            console.warn('⚠️ Erreur setup event listeners:', error);
        }
    }

    addTestGitHubButton() {
        try {
            const githubDropdown = document.querySelector('#githubDropdown + .dropdown-menu');
            if (githubDropdown && !document.getElementById('github-test')) {
                // Bouton test de connexion
                const testBtn = document.createElement('li');
                testBtn.innerHTML = `
                    <a class="dropdown-item" href="#" id="github-test">
                        <i class="bi bi-wifi"></i> Tester la connexion
                    </a>
                `;
                githubDropdown.appendChild(testBtn);
                
                // Bouton rechargement forcé
                const reloadBtn = document.createElement('li');
                reloadBtn.innerHTML = `
                    <a class="dropdown-item" href="#" id="github-reload">
                        <i class="bi bi-arrow-clockwise"></i> Recharger depuis GitHub
                    </a>
                `;
                githubDropdown.appendChild(reloadBtn);
                
                // Séparateur
                const separator = document.createElement('li');
                separator.innerHTML = '<hr class="dropdown-divider">';
                githubDropdown.appendChild(separator);
                
                // Bouton hard refresh
                const hardRefreshBtn = document.createElement('li');
                hardRefreshBtn.innerHTML = `
                    <a class="dropdown-item" href="#" id="github-hard-refresh">
                        <i class="bi bi-arrow-repeat"></i> Actualiser la page
                    </a>
                `;
                githubDropdown.appendChild(hardRefreshBtn);
                
                // Event listeners
                document.getElementById('github-test').onclick = (e) => {
                    e.preventDefault();
                    this.testGitHub();
                };
                
                document.getElementById('github-reload').onclick = (e) => {
                    e.preventDefault();
                    this.reloadFromGitHub();
                };
                
                document.getElementById('github-hard-refresh').onclick = (e) => {
                    e.preventDefault();
                    this.hardRefresh();
                };
            }
        } catch (error) {
            console.warn('⚠️ Erreur ajout boutons GitHub:', error);
        }
    }

    /* ===== CONFIGURATION GITHUB ===== */
    setupGitHub() {
        const token = prompt('Entrez votre token GitHub (commence par ghp_) :');
        if (token && token.startsWith('ghp_')) {
            localStorage.setItem('github_token', token);
            this.githubToken = token;
            this.isEditMode = true;
            this.setupUI(); // Reconfigure toute l'UI avec le nouveau mode
            this.render();
            this.showToast('✅ Token GitHub configuré ! Mode édition activé.', 'success');
        } else if (token) {
            alert('Token invalide. Il doit commencer par "ghp_"');
        }
    }

    /* ===== SAUVEGARDE SUR GITHUB ===== */
    async saveToGitHub() {
        if (!this.githubToken) {
            console.warn('❌ Pas de token GitHub');
            this.showToast('❌ Token GitHub requis pour sauvegarder', 'warning');
            return false;
        }

        try {
            console.log('💾 Début sauvegarde sur GitHub...');
            console.log('🔧 Config:', this.config);
            console.log('📊 Données à sauvegarder:', {
                tested: this.data.tested.length,
                wishlist: this.data.wishlist.length
            });
            
            // Construire le JSON complet
            const fullData = {
                config: {
                    title: "Mon Carnet Gastro",
                    author: "Gianni",
                    location: "Paris, France"
                },
                cuisineTypes: this.generateCuisineTypesObject(),
                tested: this.data.tested,
                wishlist: this.data.wishlist,
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    totalEntries: this.data.tested.length + this.data.wishlist.length
                }
            };

            console.log('📄 JSON généré:', JSON.stringify(fullData, null, 2).substring(0, 500) + '...');

            // Encoder en base64
            const jsonString = JSON.stringify(fullData, null, 2);
            const content = btoa(unescape(encodeURIComponent(jsonString)));
            console.log('🔐 Contenu encodé (longueur):', content.length);
            
            // Préparer la requête
            const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.fileName}`;
            console.log('🔗 URL API:', url);
            
            const payload = {
                message: `Mise à jour restaurants - ${new Date().toLocaleString()}`,
                content: content,
                branch: this.config.branch
            };
            
            // Inclure le SHA si on l'a (pour mise à jour)
            if (this.fileSha) {
                payload.sha = this.fileSha;
                console.log('🔑 SHA utilisé:', this.fileSha);
            } else {
                console.log('⚠️ Pas de SHA - création d\'un nouveau fichier');
            }
            
            console.log('📤 Envoi vers GitHub...');
            
            // Envoyer à GitHub
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(payload)
            });

            console.log('📨 Réponse GitHub status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Erreur GitHub API:', errorData);
                throw new Error(`GitHub API Error (${response.status}): ${errorData.message}`);
            }

            const result = await response.json();
            console.log('✅ Réponse GitHub réussie:', result);
            
            this.fileSha = result.content.sha; // Mettre à jour le SHA
            console.log('🔑 Nouveau SHA sauvegardé:', this.fileSha);
            
            console.log('✅ Sauvegarde GitHub complètement réussie');
            return true;
            
        } catch (error) {
            console.error('❌ Erreur complète sauvegarde GitHub:', error);
            this.showToast('❌ Erreur sauvegarde: ' + error.message, 'danger');
            return false;
        }
    }

    /* ===== SYNCHRONISATION ET SAUVEGARDE ===== */
    async manualSync() {
        if (!this.isEditMode) {
            // En mode lecture : juste recharger
            try {
                await this.loadData();
                this.render();
                this.showToast('✅ Données rechargées depuis GitHub !', 'success');
            } catch (error) {
                this.showToast('⚠️ Impossible de recharger depuis GitHub', 'warning');
            }
            return;
        }
        
        // En mode édition : SAUVEGARDER vers GitHub
        try {
            this.showToast('💾 Sauvegarde en cours...', 'info');
            const success = await this.saveToGitHub();
            
            if (success) {
                this.showToast('✅ Sauvegardé ! Rechargez (F5) pour voir les changements', 'success');
            }
            
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            this.showToast('❌ Erreur de sauvegarde', 'danger');
        }
    }

    // Nouvelle fonction pour recharger depuis GitHub (si besoin)
    async reloadFromGitHub() {
        try {
            this.showToast('🔄 Rechargement depuis GitHub...', 'info');
            await this.loadData();
            this.render();
            this.showToast('✅ Données rechargées depuis GitHub !', 'success');
        } catch (error) {
            console.error('Erreur rechargement:', error);
            this.showToast('❌ Erreur de rechargement', 'danger');
        }
    }

    // Fonction pour hard refresh de la page (alternative)
    hardRefresh() {
        if (confirm('🔄 Actualiser la page ?\n\nCela va recharger complètement l\'application avec les dernières données GitHub.')) {
            // Force un hard refresh (bypass cache)
            window.location.reload(true);
        }
    }

    // Test de connectivité GitHub
    async testGitHub() {
        if (!this.githubToken) {
            this.showToast('❌ Token GitHub requis pour tester', 'warning');
            return;
        }

        try {
            this.showToast('🔍 Test de connectivité GitHub...', 'info');
            
            // Test 1: Vérifier le repository
            const repoUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}`;
            console.log('🔍 Test repository:', repoUrl);
            
            const repoResponse = await fetch(repoUrl, {
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!repoResponse.ok) {
                throw new Error(`Repository non accessible: ${repoResponse.status}`);
            }
            
            const repoData = await repoResponse.json();
            console.log('✅ Repository trouvé:', repoData.name, repoData.permissions);
            
            // Test 2: Vérifier le fichier
            const fileUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.fileName}`;
            console.log('🔍 Test fichier:', fileUrl);
            
            const fileResponse = await fetch(fileUrl, {
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (fileResponse.ok) {
                const fileData = await fileResponse.json();
                console.log('✅ Fichier trouvé, SHA:', fileData.sha);
                this.showToast('✅ GitHub connecté ! Données immédiatement à jour.', 'success');
            } else if (fileResponse.status === 404) {
                console.log('📄 Fichier n\'existe pas encore');
                this.showToast('⚠️ Fichier n\'existe pas - sera créé à la première sauvegarde', 'warning');
            } else {
                throw new Error(`Fichier non accessible: ${fileResponse.status}`);
            }
            
        } catch (error) {
            console.error('❌ Erreur test GitHub:', error);
            this.showToast('❌ Test GitHub échoué: ' + error.message, 'danger');
        }
    }

    // Sauvegarde automatique après chaque modification
    async autoSave() {
        if (!this.isEditMode) return;
        
        console.log('💾 Sauvegarde automatique...');
        
        // Indicateur visuel discret
        this.updateSyncStatus('💾 Sauvegarde...');
        
        try {
            const success = await this.saveToGitHub();
            
            if (success) {
                console.log('✅ Sauvegarde automatique réussie');
                if (this.githubToken) {
                    this.updateSyncStatus('✅ Sauvegardé - F5 pour voir');
                } else {
                    this.updateSyncStatus('✅ Sauvegardé - délai 2-10min');
                }
                
                // Remettre le statut normal après 3 secondes
                setTimeout(() => {
                    this.updateSyncStatus();
                }, 3000);
            } else {
                throw new Error('Sauvegarde échouée');
            }
            
        } catch (error) {
            console.error('❌ Erreur sauvegarde automatique:', error);
            this.updateSyncStatus('❌ Erreur');
            this.showToast('⚠️ Erreur sauvegarde automatique - vérifiez la console', 'warning');
            
            // Remettre le statut normal après 3 secondes
            setTimeout(() => {
                this.updateSyncStatus();
            }, 3000);
        }
    }

    /* ===== RENDU ===== */
    render() {
        this.renderStats();
        this.renderTested();
        this.renderWishlist();
    }

    renderStats() {
        // Statistiques
        document.getElementById('tested-count').textContent = this.data.tested.length;
        document.getElementById('wishlist-count').textContent = this.data.wishlist.length;
        
        if (this.data.tested.length > 0) {
            const avgRating = this.data.tested.reduce((sum, r) => sum + this.calculateRating(r.ratings), 0) / this.data.tested.length;
            document.getElementById('avg-rating').textContent = avgRating.toFixed(1);
        } else {
            document.getElementById('avg-rating').textContent = '--';
        }
    }

    renderTested() {
        const container = document.getElementById('tested-grid');
        if (this.data.tested.length === 0) {
            container.innerHTML = this.createEmptyState('tested');
        } else {
            container.innerHTML = this.data.tested.map(r => this.createTestedCard(r)).join('');
        }
    }

    renderWishlist() {
        const container = document.getElementById('wishlist-grid');
        if (this.data.wishlist.length === 0) {
            container.innerHTML = this.createEmptyState('wishlist');
        } else {
            container.innerHTML = this.data.wishlist.map(r => this.createWishlistCard(r)).join('');
        }
    }

    /* ===== CRÉATION DES CARDS ===== */
    createTestedCard(restaurant) {
        const rating = this.calculateRating(restaurant.ratings);
        const photo = restaurant.photo || restaurant.photos?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=250&fit=crop';
        
        return `
            <div class="col-md-6 mb-4">
                <div class="card restaurant-card h-100">
                    <img src="${photo}" class="card-img-top" alt="${restaurant.name}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${restaurant.name}</h5>
                            <span class="badge bg-primary">${restaurant.type}</span>
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
                            <strong>${rating.toFixed(1)}/5</strong> ${this.generateStars(rating)}
                        </div>

                        ${restaurant.comment ? `<blockquote class="blockquote-footer mt-3">"${restaurant.comment}"</blockquote>` : ''}

                        <div class="action-buttons edit-only" style="display: ${this.isEditMode ? 'flex' : 'none'};">
                            <button class="btn btn-outline-primary btn-action" onclick="app.editRestaurant(${restaurant.id}, 'tested')">
                                <i class="bi bi-pencil"></i> Modifier
                            </button>
                            <button class="btn btn-outline-danger btn-action" onclick="app.deleteRestaurant(${restaurant.id}, 'tested')">
                                <i class="bi bi-trash"></i> Supprimer
                            </button>
                            ${restaurant.coordinates ? `
                            <button class="btn btn-outline-info btn-action" onclick="app.showOnMap(${restaurant.coordinates.lat}, ${restaurant.coordinates.lng})">
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
        const photo = restaurant.photo || restaurant.photos?.[0] || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=250&fit=crop';
        
        return `
            <div class="col-md-6 mb-4">
                <div class="card restaurant-card wishlist-card h-100">
                    <img src="${photo}" class="card-img-top" alt="${restaurant.name}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${restaurant.name}</h5>
                            <span class="badge bg-success">${restaurant.type}</span>
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

                        <div class="action-buttons edit-only" style="display: ${this.isEditMode ? 'flex' : 'none'};">
                            <button class="btn btn-success btn-action" onclick="app.moveToTested(${restaurant.id})">
                                <i class="bi bi-arrow-right"></i> Testé !
                            </button>
                            <button class="btn btn-outline-primary btn-action" onclick="app.editRestaurant(${restaurant.id}, 'wishlist')">
                                <i class="bi bi-pencil"></i> Modifier
                            </button>
                            <button class="btn btn-outline-danger btn-action" onclick="app.deleteRestaurant(${restaurant.id}, 'wishlist')">
                                <i class="bi bi-trash"></i> Supprimer
                            </button>
                            ${restaurant.coordinates ? `
                            <button class="btn btn-outline-info btn-action" onclick="app.showOnMap(${restaurant.coordinates.lat}, ${restaurant.coordinates.lng})">
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
        const icon = isWishlist ? 'heart' : 'star';
        const title = isWishlist ? 'Aucun restaurant en wishlist' : 'Aucun restaurant testé';
        const text = isWishlist ? 'Ajoutez des restaurants que vous aimeriez tester !' : 'Commencez par ajouter vos premiers restaurants testés !';
        
        return `
            <div class="col-12 text-center py-5">
                <i class="bi bi-${icon} fs-1 text-muted mb-3"></i>
                <h4>${title}</h4>
                <p class="text-muted">${text}</p>
                ${this.isEditMode ? `
                <button class="btn btn-${isWishlist ? 'success' : 'primary'}" onclick="app.openAddModal('${type}')">
                    <i class="bi bi-plus-lg"></i> Ajouter
                </button>
                ` : `
                <button class="btn btn-outline-primary" onclick="app.setupGitHub()">
                    <i class="bi bi-github"></i> Se connecter pour ajouter
                </button>
                `}
            </div>
        `;
    }

    /* ===== MODAL D'AJOUT/MODIFICATION ===== */
    openAddModal(type) {
        if (!this.isEditMode) {
            this.showToast('❌ Mode lecture seule', 'warning');
            return;
        }

        console.log('📝 Ouverture modal:', type);

        const modal = new bootstrap.Modal(document.getElementById('restaurant-modal'));
        
        // Reset du formulaire
        document.getElementById('restaurant-form').reset();
        document.getElementById('restaurant-id').value = '';
        document.getElementById('restaurant-type').value = type;
        
        // Configuration selon le type
        document.getElementById('modal-title').textContent = 
            type === 'tested' ? 'Ajouter un restaurant testé' : 'Ajouter à la wishlist';
        
        // Afficher/masquer les sections
        document.getElementById('ratings-section').style.display = type === 'tested' ? 'block' : 'none';
        document.getElementById('wishlist-section').style.display = type === 'wishlist' ? 'block' : 'none';
        
        modal.show();
        
        // Setup après ouverture du modal
        setTimeout(() => {
            this.updateCuisineDropdown();
            this.setupCuisineAutocomplete();
        }, 200);
    }

    setupCuisineAutocomplete() {
        try {
            const cuisineInput = document.getElementById('restaurant-cuisine');
            const cuisineDropdown = document.getElementById('cuisine-dropdown');
            
            if (!cuisineInput || !cuisineDropdown) {
                console.log('⚠️ Éléments cuisine pas encore dans le DOM');
                return;
            }
            
            console.log('✅ Setup autocomplete cuisine');
            
            // Input event
            cuisineInput.addEventListener('input', (e) => {
                this.filterCuisineOptions(e.target.value);
            });
            
            // Focus event
            cuisineInput.addEventListener('focus', () => {
                this.showCuisineDropdown();
            });
            
            // Click outside
            document.addEventListener('click', (e) => {
                if (!cuisineInput.contains(e.target) && !cuisineDropdown.contains(e.target)) {
                    cuisineDropdown.style.display = 'none';
                }
            });
            
        } catch (error) {
            console.warn('⚠️ Erreur setup cuisine autocomplete:', error);
        }
    }

    updateCuisineDropdown() {
        try {
            const dropdown = document.getElementById('cuisine-dropdown');
            if (!dropdown) {
                console.log('⚠️ Dropdown cuisine pas trouvé');
                return;
            }
            
            // Obtenir tous les types de cuisine uniques
            const allCuisines = new Set();
            
            // Ajouter les types par défaut
            this.data.cuisineTypes.forEach(type => allCuisines.add(type.value));
            
            // Ajouter les types des restaurants existants
            [...this.data.tested, ...this.data.wishlist].forEach(restaurant => {
                allCuisines.add(restaurant.type);
            });
            
            // Générer les options
            const sortedCuisines = Array.from(allCuisines).sort();
            dropdown.innerHTML = sortedCuisines.map(cuisine => {
                const cuisineData = this.data.cuisineTypes.find(c => c.value === cuisine);
                const emoji = cuisineData ? cuisineData.emoji : '🍽️';
                return `<div class="dropdown-item" onclick="app.selectCuisine('${cuisine}')">${emoji} ${cuisine}</div>`;
            }).join('');
            
            console.log('✅ Dropdown cuisine mise à jour avec', sortedCuisines.length, 'options');
            
        } catch (error) {
            console.warn('⚠️ Erreur update cuisine dropdown:', error);
        }
    }

    filterCuisineOptions(searchValue) {
        const dropdown = document.getElementById('cuisine-dropdown');
        if (!dropdown) return;
        
        const items = dropdown.querySelectorAll('.dropdown-item');
        const search = searchValue.toLowerCase();
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(search) ? 'block' : 'none';
        });
        
        this.showCuisineDropdown();
    }

    showCuisineDropdown() {
        const dropdown = document.getElementById('cuisine-dropdown');
        if (dropdown) {
            dropdown.style.display = 'block';
        }
    }

    selectCuisine(cuisine) {
        const cuisineInput = document.getElementById('restaurant-cuisine');
        const dropdown = document.getElementById('cuisine-dropdown');
        
        if (cuisineInput) {
            cuisineInput.value = cuisine;
        }
        
        if (dropdown) {
            dropdown.style.display = 'none';
        }
        
        // Déclencher l'événement input pour valider le formulaire si nécessaire
        if (cuisineInput) {
            cuisineInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    addNewCuisineType(cuisineValue) {
        const normalizedValue = cuisineValue.toLowerCase().trim();
        
        // Vérifier si le type existe déjà
        const exists = this.data.cuisineTypes.some(type => 
            type.value.toLowerCase() === normalizedValue
        );
        
        if (!exists && normalizedValue) {
            const newType = {
                value: normalizedValue,
                label: `🍽️ ${cuisineValue}`,
                emoji: '🍽️'
            };
            
            this.data.cuisineTypes.push(newType);
            console.log('Nouveau type de cuisine ajouté:', newType);
        }
        
        return normalizedValue;
    }

    async saveRestaurant() {
        if (!this.isEditMode) return;
        
        const form = document.getElementById('restaurant-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const id = document.getElementById('restaurant-id').value;
        const type = document.getElementById('restaurant-type').value;
        const isEdit = !!id;
        
        // Traiter le type de cuisine (ajouter s'il est nouveau)
        const cuisineInput = document.getElementById('restaurant-cuisine').value;
        const cuisineType = this.addNewCuisineType(cuisineInput);
        
        const restaurantData = {
            id: isEdit ? parseInt(id) : Date.now(),
            name: document.getElementById('restaurant-name').value,
            type: cuisineType,
            location: document.getElementById('restaurant-location').value,
            address: document.getElementById('restaurant-address').value,
            priceRange: document.getElementById('restaurant-price').value,
            photo: document.getElementById('restaurant-photo').value,
            comment: document.getElementById('restaurant-comment').value,
            dateAdded: isEdit ? this.data[type].find(r => r.id === parseInt(id)).dateAdded : new Date().toISOString().split('T')[0]
        };
        
        if (type === 'tested') {
            restaurantData.ratings = {
                plats: parseFloat(document.getElementById('rating-plats').value),
                vins: parseFloat(document.getElementById('rating-vins').value),
                accueil: parseFloat(document.getElementById('rating-accueil').value),
                lieu: parseFloat(document.getElementById('rating-lieu').value)
            };
            restaurantData.dateVisited = restaurantData.dateAdded;
        } else {
            restaurantData.reason = document.getElementById('restaurant-reason').value;
        }
        
        // Ajouter/modifier dans les données
        if (isEdit) {
            const index = this.data[type].findIndex(r => r.id === parseInt(id));
            this.data[type][index] = restaurantData;
        } else {
            this.data[type].push(restaurantData);
        }
        
        // Fermer le modal et re-render immédiatement
        bootstrap.Modal.getInstance(document.getElementById('restaurant-modal')).hide();
        this.render();
        
        // Notification selon le mode
        if (this.githubToken) {
            this.showToast(isEdit ? '✅ Restaurant modifié ! (F5 pour voir immédiatement)' : '✅ Restaurant ajouté ! (F5 pour voir immédiatement)', 'success');
        } else {
            this.showToast(isEdit ? '✅ Restaurant modifié ! (peut prendre 2-10min à apparaître)' : '✅ Restaurant ajouté ! (peut prendre 2-10min à apparaître)', 'warning');
        }
        
        // Sauvegarde automatique en arrière-plan
        await this.autoSave();
    }

    editRestaurant(id, type) {
        if (!this.isEditMode) return;
        
        const restaurant = this.data[type].find(r => r.id === id);
        if (!restaurant) return;
        
        console.log('✏️ Édition restaurant:', restaurant.name);
        
        // Remplir le formulaire
        document.getElementById('restaurant-id').value = id;
        document.getElementById('restaurant-type').value = type;
        document.getElementById('restaurant-name').value = restaurant.name;
        document.getElementById('restaurant-cuisine').value = restaurant.type;
        document.getElementById('restaurant-location').value = restaurant.location;
        document.getElementById('restaurant-address').value = restaurant.address || '';
        document.getElementById('restaurant-price').value = restaurant.priceRange || '€€';
        document.getElementById('restaurant-photo').value = restaurant.photo || '';
        document.getElementById('restaurant-comment').value = restaurant.comment || '';
        
        if (type === 'tested') {
            document.getElementById('rating-plats').value = restaurant.ratings.plats || 5;
            document.getElementById('rating-vins').value = restaurant.ratings.vins || 5;
            document.getElementById('rating-accueil').value = restaurant.ratings.accueil || 5;
            document.getElementById('rating-lieu').value = restaurant.ratings.lieu || 5;
            
            // Mettre à jour les affichages des sliders
            document.getElementById('plats-value').textContent = (restaurant.ratings.plats || 5).toFixed(1);
            document.getElementById('vins-value').textContent = (restaurant.ratings.vins || 5).toFixed(1);
            document.getElementById('accueil-value').textContent = (restaurant.ratings.accueil || 5).toFixed(1);
            document.getElementById('lieu-value').textContent = (restaurant.ratings.lieu || 5).toFixed(1);
        } else {
            document.getElementById('restaurant-reason').value = restaurant.reason || '';
        }
        
        // Ouvrir le modal
        document.getElementById('modal-title').textContent = `Modifier ${restaurant.name}`;
        document.getElementById('ratings-section').style.display = type === 'tested' ? 'block' : 'none';
        document.getElementById('wishlist-section').style.display = type === 'wishlist' ? 'block' : 'none';
        
        const modal = new bootstrap.Modal(document.getElementById('restaurant-modal'));
        modal.show();
        
        // Setup après ouverture du modal
        setTimeout(() => {
            this.updateCuisineDropdown();
            this.setupCuisineAutocomplete();
        }, 200);
    }

    async deleteRestaurant(id, type) {
        if (!this.isEditMode) return;
        
        const restaurant = this.data[type].find(r => r.id === id);
        if (!restaurant) return;
        
        if (confirm(`Supprimer "${restaurant.name}" ?`)) {
            // Supprimer immédiatement
            this.data[type] = this.data[type].filter(r => r.id !== id);
            this.render();
            this.showToast('✅ Restaurant supprimé ! (F5 pour synchroniser)', 'success');
            
            // Sauvegarde automatique en arrière-plan
            await this.autoSave();
        }
    }

    moveToTested(id) {
        if (!this.isEditMode) return;
        
        const restaurant = this.data.wishlist.find(r => r.id === id);
        if (!restaurant) return;
        
        // Ouvrir le modal de transfert
        this.openTransferModal(restaurant);
    }

    openTransferModal(restaurant) {
        // Créer le modal s'il n'existe pas
        let modal = document.getElementById('transfer-modal');
        if (!modal) {
            modal = this.createTransferModal();
            document.body.appendChild(modal);
        }
        
        // Remplir les données
        document.getElementById('transfer-restaurant-name').textContent = restaurant.name;
        document.getElementById('transfer-restaurant-id').value = restaurant.id;
        
        // Reset des sliders
        ['plats', 'vins', 'accueil', 'lieu'].forEach(type => {
            const slider = document.getElementById(`transfer-rating-${type}`);
            const display = document.getElementById(`transfer-${type}-value`);
            if (slider && display) {
                slider.value = 5;
                display.textContent = '5.0';
            }
        });
        
        document.getElementById('transfer-comment').value = '';
        
        // Afficher le modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    createTransferModal() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'transfer-modal';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">🌟 Transférer vers "Testés"</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Ajoutez vos notes pour <strong id="transfer-restaurant-name"></strong> :</p>
                        <input type="hidden" id="transfer-restaurant-id">
                        
                        <div class="row mb-3">
                            <div class="col-6">
                                <label class="form-label">🍽️ Plats (x2)</label>
                                <input type="range" class="form-range" id="transfer-rating-plats" min="1" max="5" step="0.5" value="5">
                                <div class="text-center"><span id="transfer-plats-value">5.0</span>/5</div>
                            </div>
                            <div class="col-6">
                                <label class="form-label">🍷 Vins (x1.5)</label>
                                <input type="range" class="form-range" id="transfer-rating-vins" min="1" max="5" step="0.5" value="5">
                                <div class="text-center"><span id="transfer-vins-value">5.0</span>/5</div>
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-6">
                                <label class="form-label">😊 Accueil (x1.5)</label>
                                <input type="range" class="form-range" id="transfer-rating-accueil" min="1" max="5" step="0.5" value="5">
                                <div class="text-center"><span id="transfer-accueil-value">5.0</span>/5</div>
                            </div>
                            <div class="col-6">
                                <label class="form-label">🏛️ Lieu (x1)</label>
                                <input type="range" class="form-range" id="transfer-rating-lieu" min="1" max="5" step="0.5" value="5">
                                <div class="text-center"><span id="transfer-lieu-value">5.0</span>/5</div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">💬 Votre avis après visite</label>
                            <textarea class="form-control" id="transfer-comment" rows="3" placeholder="Comment s'est passée votre expérience ?"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                        <button type="button" class="btn btn-success" onclick="app.confirmTransfer()">
                            <i class="bi bi-arrow-right"></i> Transférer
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Ajouter les event listeners pour les sliders
        setTimeout(() => {
            ['plats', 'vins', 'accueil', 'lieu'].forEach(type => {
                const slider = document.getElementById(`transfer-rating-${type}`);
                const display = document.getElementById(`transfer-${type}-value`);
                
                if (slider && display) {
                    slider.addEventListener('input', () => {
                        display.textContent = parseFloat(slider.value).toFixed(1);
                    });
                }
            });
        }, 100);
        
        return modal;
    }

    async confirmTransfer() {
        const id = parseInt(document.getElementById('transfer-restaurant-id').value);
        const restaurant = this.data.wishlist.find(r => r.id === id);
        if (!restaurant) return;
        
        // Récupérer les notes
        const ratings = {
            plats: parseFloat(document.getElementById('transfer-rating-plats').value),
            vins: parseFloat(document.getElementById('transfer-rating-vins').value),
            accueil: parseFloat(document.getElementById('transfer-rating-accueil').value),
            lieu: parseFloat(document.getElementById('transfer-rating-lieu').value)
        };
        
        const comment = document.getElementById('transfer-comment').value;
        
        // Créer l'entrée testée
        const testedRestaurant = {
            ...restaurant,
            ratings: ratings,
            dateVisited: new Date().toISOString().split('T')[0],
            comment: comment || restaurant.comment
        };
        delete testedRestaurant.reason;
        
        // Déplacer immédiatement
        this.data.tested.push(testedRestaurant);
        this.data.wishlist = this.data.wishlist.filter(r => r.id !== id);
        
        // Fermer le modal et mettre à jour l'affichage
        bootstrap.Modal.getInstance(document.getElementById('transfer-modal')).hide();
        
        // Activer l'onglet testés
        document.getElementById('tested-tab').click();
        this.render();
        
        this.showToast('✅ Restaurant déplacé vers "Testés" ! (F5 pour synchroniser)', 'success');
        
        // Sauvegarde automatique en arrière-plan
        await this.autoSave();
    }

    /* ===== CARTE ===== */
    showOnMap(lat, lng) {
        // Activer l'onglet carte
        const mapTab = document.getElementById('map-tab');
        if (mapTab) {
            mapTab.click();
        }
        
        // Attendre que la carte soit initialisée et centrer sur le point
        setTimeout(() => {
            if (!this.map) {
                this.initMap();
            }
            if (this.map) {
                this.map.setView([lat, lng], 16);
            }
        }, 100);
    }

    initMap() {
        if (this.map) return;
        
        this.map = L.map('map').setView([48.8566, 2.3522], 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        // Ajouter les marqueurs pour les restaurants testés (bleu)
        this.data.tested.forEach(restaurant => {
            if (restaurant.coordinates) {
                const rating = this.calculateRating(restaurant.ratings);
                const marker = L.marker([restaurant.coordinates.lat, restaurant.coordinates.lng]).addTo(this.map);
                
                marker.bindPopup(`
                    <div style="min-width: 200px;">
                        <h6><strong>${restaurant.name}</strong></h6>
                        <p class="mb-1"><span class="badge bg-primary">${restaurant.type}</span></p>
                        <p class="mb-2">${restaurant.location}</p>
                        <div>${this.generateStars(rating)} ${rating.toFixed(1)}/5</div>
                        ${restaurant.comment ? `<p class="small mt-2"><em>"${restaurant.comment}"</em></p>` : ''}
                    </div>
                `);
            }
        });
        
        // Ajouter les marqueurs pour la wishlist (vert)
        this.data.wishlist.forEach(restaurant => {
            if (restaurant.coordinates) {
                const marker = L.marker([restaurant.coordinates.lat, restaurant.coordinates.lng]).addTo(this.map);
                marker.bindPopup(`
                    <div style="min-width: 200px;">
                        <h6><strong>${restaurant.name}</strong></h6>
                        <p class="mb-1"><span class="badge bg-success">${restaurant.type}</span></p>
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

    /* ===== UTILITAIRES ===== */
    calculateRating(ratings) {
        return (ratings.plats * 2 + ratings.vins * 1.5 + ratings.accueil * 1.5 + ratings.lieu * 1) / 6;
    }

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

    showToast(message, type = 'info') {
        try {
            console.log(`📢 Toast: ${message}`);
            
            // Toast simple sans dépendance Bootstrap
            const toast = document.createElement('div');
            toast.className = `alert alert-${type} position-fixed`;
            toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; opacity: 0.9;';
            toast.textContent = message;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 3000);
            
        } catch (error) {
            console.warn('⚠️ Erreur toast, fallback alert:', error);
            alert(message); // Fallback simple
        }
    }

    /* ===== DONNÉES PAR DÉFAUT ===== */
    parseCuisineTypes(cuisineTypesData) {
        const defaults = this.getDefaultCuisineTypes();
        if (!cuisineTypesData || typeof cuisineTypesData !== 'object') {
            return defaults;
        }
        
        const parsed = [];
        for (const [key, value] of Object.entries(cuisineTypesData)) {
            parsed.push({
                value: key,
                label: `${value.emoji || '🍽️'} ${key}`,
                emoji: value.emoji || '🍽️'
            });
        }
        
        return parsed.length > 0 ? parsed : defaults;
    }

    generateCuisineTypesObject() {
        const obj = {};
        this.data.cuisineTypes.forEach(cuisine => {
            obj[cuisine.value] = {
                color: 'primary',
                emoji: cuisine.emoji
            };
        });
        return obj;
    }

    getDefaultCuisineTypes() {
        return [
            { value: 'français', label: '🥖 Français', emoji: '🥖' },
            { value: 'italien', label: '🍕 Italien', emoji: '🍕' },
            { value: 'asiatique', label: '🍜 Asiatique', emoji: '🍜' },
            { value: 'japonais', label: '🍣 Japonais', emoji: '🍣' }
        ];
    }

    getDefaultTestedData() {
        return [
            {
                id: 1,
                name: "Le Comptoir du Relais",
                type: "français",
                location: "6ème arrondissement",
                address: "9 Carrefour de l'Odéon, 75006 Paris",
                coordinates: { lat: 48.8534, lng: 2.3387 },
                ratings: { plats: 4.5, vins: 4.0, accueil: 4.5, lieu: 4.0 },
                comment: "Bistrot authentique avec une cuisine excellente !",
                dateVisited: "2024-12-15",
                dateAdded: "2024-12-15",
                priceRange: "€€",
                photo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop"
            }
        ];
    }

    getDefaultWishlistData() {
        return [
            {
                id: 4,
                name: "L'Ami Jean",
                type: "français",
                location: "7ème arrondissement",
                address: "27 rue Malar, 75007 Paris",
                coordinates: { lat: 48.8584, lng: 2.3019 },
                reason: "Recommandé par un ami pour la cuisine basque",
                dateAdded: "2024-12-01",
                priceRange: "€€€",
                photo: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=250&fit=crop"
            }
        ];
    }
}

/* ===== INITIALISATION ===== */
let app;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Démarrage de l\'application...');
    
    app = new SimpleRestaurantApp();
    await app.init();
    
    console.log('✅ Application prête !');
});

/* ===== FONCTIONS GLOBALES ===== */
function saveRestaurant() {
    if (app) app.saveRestaurant();
}

function selectCuisine(cuisine) {
    if (app) app.selectCuisine(cuisine);
}

function confirmTransfer() {
    if (app) app.confirmTransfer();
}
