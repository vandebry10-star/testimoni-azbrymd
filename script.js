// Supabase Configuration
const SUPABASE_URL = 'https://your-project.supabase.co'; // Ganti dengan URL Supabase kamu
const SUPABASE_ANON_KEY = 'your-anon-key'; // Ganti dengan anon key kamu

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const testimoniForm = document.getElementById('testimoniForm');
    const testimoniContainer = document.getElementById('testimoniContainer');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const stars = document.querySelectorAll('.star');
    const loadingElement = document.getElementById('loading');
    
    // Statistics elements
    const totalTestimoniElement = document.getElementById('totalTestimoni');
    const avgRatingElement = document.getElementById('avgRating');
    const recommendRateElement = document.getElementById('recommendRate');

    // Data testimoni
    let testimonials = [];

    // Star rating functionality
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            const category = this.parentElement.getAttribute('data-category');
            
            // Reset semua stars dalam category ini
            const categoryStars = this.parentElement.querySelectorAll('.star');
            categoryStars.forEach(s => s.classList.remove('active'));
            
            // Activate stars sampai rating yang dipilih
            for (let i = 0; i < rating; i++) {
                categoryStars[i].classList.add('active');
            }
        });
    });

    // Form submission
    testimoniForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const nama = formData.get('nama').trim();
        const pesan = formData.get('pesan').trim();
        
        // Collect ratings
        const ratings = {};
        const ratingCategories = ['fastResponse', 'kualitas', 'kemudahan', 'update', 'value'];
        let totalRating = 0;
        
        ratingCategories.forEach(category => {
            const stars = document.querySelectorAll(`.stars[data-category="${category}"] .star.active`);
            const rating = stars.length;
            ratings[category] = rating;
            totalRating += rating;
        });
        
        const overallRating = totalRating / ratingCategories.length;
        
        // Validasi rating
        if (Object.values(ratings).some(rating => rating === 0)) {
            showMessage('Harap berikan rating untuk semua kategori!', 'error');
            return;
        }

        // Validasi input
        if (!nama || !pesan) {
            showMessage('Harap isi nama dan pesan testimoni!', 'error');
            return;
        }
        
        // Create new testimonial
        const newTestimonial = {
            nama: nama,
            pesan: pesan,
            ratings: ratings,
            overall_rating: overallRating,
            created_at: new Date().toISOString()
        };
        
        try {
            // Save to Supabase
            const { data, error } = await supabase
                .from('testimonials')
                .insert([newTestimonial])
                .select();

            if (error) throw error;
            
            // Add to local array
            testimonials.unshift({ ...newTestimonial, id: data[0].id });
            
            // Reset form
            this.reset();
            resetStars();
            
            // Update display
            renderTestimonials();
            updateStatistics();
            
            // Show success message
            showMessage('Testimoni berhasil dikirim! Terima kasih atas feedbacknya.', 'success');
            
        } catch (error) {
            console.error('Error saving testimonial:', error);
            showMessage('Gagal mengirim testimoni. Silakan coba lagi.', 'error');
        }
    });

    // Filter functionality
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter testimonials
            const filter = this.getAttribute('data-filter');
            renderTestimonials(filter);
        });
    });

    // Reset stars
    function resetStars() {
        stars.forEach(star => star.classList.remove('active'));
    }

    // Show message
    function showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.textContent = message;
        
        testimoniForm.parentNode.insertBefore(messageDiv, testimoniForm);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // Render testimonials
    function renderTestimonials(filter = 'all') {
        testimoniContainer.innerHTML = '';
        
        let filteredTestimonials = testimonials;
        
        if (filter !== 'all') {
            const minRating = parseInt(filter);
            filteredTestimonials = testimonials.filter(t => 
                Math.floor(t.overall_rating) >= minRating
            );
        }
        
        if (filteredTestimonials.length === 0) {
            testimoniContainer.innerHTML = `
                <div class="no-testimoni">
                    <p>Tidak ada testimoni yang sesuai dengan filter ini.</p>
                </div>
            `;
            return;
        }
        
        filteredTestimonials.forEach(testimonial => {
            const testimonialElement = createTestimonialElement(testimonial);
            testimoniContainer.appendChild(testimonialElement);
        });
    }

    // Create testimonial element
    function createTestimonialElement(testimonial) {
        const element = document.createElement('div');
        element.className = 'testimoni-card';
        
        const ratingCategories = {
            fastResponse: 'Fast Response',
            kualitas: 'Kualitas Script',
            kemudahan: 'Kemudahan Penggunaan',
            update: 'Dukungan Update',
            value: 'Value for Money'
        };
        
        const ratingItems = Object.entries(ratingCategories)
            .map(([key, label]) => `
                <div class="rating-item">
                    <span class="rating-label">${label}</span>
                    <span class="rating-value">${'★'.repeat(testimonial.ratings[key])}</span>
                </div>
            `).join('');
        
        element.innerHTML = `
            <div class="testimoni-header">
                <div class="user-info">
                    <h4>${testimonial.nama}</h4>
                    <span class="date">${formatDate(testimonial.created_at)}</span>
                </div>
                <div class="overall-rating">
                    <div class="rating-score">${testimonial.overall_rating.toFixed(1)}</div>
                    <div class="rating-stars">${'★'.repeat(Math.round(testimonial.overall_rating))}</div>
                </div>
            </div>
            <div class="testimoni-message">
                ${testimonial.pesan}
            </div>
            <div class="rating-details">
                ${ratingItems}
            </div>
        `;
        
        return element;
    }

    // Format date
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    }

    // Update statistics
    function updateStatistics() {
        const total = testimonials.length;
        const totalRating = testimonials.reduce((sum, t) => sum + t.overall_rating, 0);
        const averageRating = total > 0 ? totalRating / total : 0;
        const recommendCount = testimonials.filter(t => t.overall_rating >= 4).length;
        const recommendPercentage = total > 0 ? (recommendCount / total) * 100 : 0;
        
        totalTestimoniElement.textContent = total;
        avgRatingElement.textContent = averageRating.toFixed(1);
        recommendRateElement.textContent = `${recommendPercentage.toFixed(0)}%`;
    }

    // Load testimonials from Supabase
    async function loadTestimonials() {
        try {
            loadingElement.style.display = 'block';
            
            const { data, error } = await supabase
                .from('testimonials')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            testimonials = data || [];
            renderTestimonials();
            updateStatistics();
            
        } catch (error) {
            console.error('Error loading testimonials:', error);
            showMessage('Gagal memuat testimoni.', 'error');
        } finally {
            loadingElement.style.display = 'none';
        }
    }

    // Export testimonials to JSON
    window.exportTestimonials = async function() {
        try {
            const { data, error } = await supabase
                .from('testimonials')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `testimoni-azbry-md-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            showMessage('Testimoni berhasil diexport!', 'success');
            
        } catch (error) {
            console.error('Error exporting testimonials:', error);
            showMessage('Gagal mengexport testimoni.', 'error');
        }
    };

    // Initialize
    loadTestimonials();
});
