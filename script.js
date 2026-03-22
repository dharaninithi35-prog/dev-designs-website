document.addEventListener('DOMContentLoaded', () => {
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.padding = '1rem 10%';
            navbar.style.background = 'rgba(9, 9, 11, 0.95)';
            navbar.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
        } else {
            navbar.style.padding = '1.5rem 10%';
            navbar.style.background = 'rgba(9, 9, 11, 0.8)';
            navbar.style.boxShadow = 'none';
        }
    });

    // Project Form Submission
    const projectForm = document.getElementById('projectForm');
    if (projectForm) {
        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = projectForm.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            const formData = new FormData();
            formData.append('name', document.getElementById('name').value);
            formData.append('email', document.getElementById('email').value);
            formData.append('serviceType', document.getElementById('project-type').value);
            formData.append('description', document.getElementById('details').value);
            // Default deadline if not provided in simple form
            formData.append('deadline', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

            try {
                const response = await fetch('http://localhost:5000/api/projects', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    alert('Success! Your message has been sent to Lumina. We will contact you soon.');
                    projectForm.reset();
                } else {
                    const errorData = await response.json();
                    alert('Submission failed: ' + (errorData.error || 'Server error'));
                }
            } catch (err) {
                console.error('Submission Error:', err);
                alert('Connection Error: Could not connect to Lumina backend.');
            } finally {
                submitBtn.textContent = 'Send Inference';
                submitBtn.disabled = false;
            }
        });
    }

    // Scroll reveal/animation logic
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.service-card, .contact-container').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.8s ease-out';
        observer.observe(el);
    });

    // Custom CSS for observer animation
    const style = document.createElement('style');
    style.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }';
    document.head.appendChild(style);
});
