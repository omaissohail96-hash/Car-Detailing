// ------------------------------
// Mobile Navigation
// ------------------------------
function toggleMobileNav() {
  const navbar = document.querySelector('.navbar');
  const mobileNav = document.querySelector('#mobileNav');
  const body = document.body;
  
  if (navbar && mobileNav) {
    const isOpen = navbar.classList.contains('nav-open');
    
    if (isOpen) {
      navbar.classList.remove('nav-open');
      body.classList.remove('nav-mobile-open');
    } else {
      navbar.classList.add('nav-open');
      body.classList.add('nav-mobile-open');
    }
  }
}

function closeMobileNav() {
  const navbar = document.querySelector('.navbar');
  const body = document.body;
  
  if (navbar) {
    navbar.classList.remove('nav-open');
    body.classList.remove('nav-mobile-open');
  }
}

// Close mobile nav when clicking outside
document.addEventListener('click', (e) => {
  const navbar = document.querySelector('.navbar');
  const navToggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('#mobileNav');
  
  if (navbar && navbar.classList.contains('nav-open')) {
    if (!mobileNav.contains(e.target) && !navToggle.contains(e.target)) {
      closeMobileNav();
    }
  }
});

// Close mobile nav when pressing escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMobileNav();
  }
});

// ------------------------------
// Booking Form Submit & Availability Check
// ------------------------------
const form = document.getElementById("bookingForm");
let availabilityTimeout;

// Real-time availability checking
function checkAvailability() {
  const datetime = form?.querySelector('input[name="datetime"]')?.value;
  const service = form?.querySelector('select[name="service"]')?.value;
  const statusDiv = document.getElementById('availabilityStatus');
  
  if (!datetime || !service || !statusDiv) return;
  
  statusDiv.innerHTML = '<span style="color: #6b7280;">Checking availability...</span>';
  
  fetch(`/api/check-availability?datetime=${encodeURIComponent(datetime)}&service=${encodeURIComponent(service)}`)
    .then(res => res.json())
    .then(data => {
      if (data.available) {
        statusDiv.innerHTML = `<span style="color: #10b981; font-weight: 600;">✓ ${data.message}</span>`;
      } else {
        let html = `<span style="color: #ef4444; font-weight: 600;">✗ ${data.message}</span>`;
        if (data.suggestedTimes && data.suggestedTimes.length > 0) {
          html += '<div style="margin-top: 0.5rem; font-size: 0.85rem;"><strong>Suggested available times:</strong><br>';
          data.suggestedTimes.forEach(time => {
            const date = new Date(time);
            const timeBtn = `<button type="button" onclick="selectSuggestedTime('${time}')" style="background: #3b82f6; color: white; padding: 0.25rem 0.5rem; margin: 0.25rem 0.25rem 0 0; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</button>`;
            html += timeBtn;
          });
          html += '</div>';
        }
        statusDiv.innerHTML = html;
      }
    })
    .catch(err => {
      console.error('Availability check failed:', err);
      statusDiv.innerHTML = '<span style="color: #f59e0b;">Could not check availability</span>';
    });
}

// Function to select suggested time
window.selectSuggestedTime = function(datetime) {
  const datetimeInput = form?.querySelector('input[name="datetime"]');
  if (datetimeInput) {
    datetimeInput.value = datetime;
    checkAvailability();
  }
};

// Add event listeners for real-time checking
if (form) {
  const datetimeInput = form.querySelector('input[name="datetime"]');
  const serviceSelect = form.querySelector('select[name="service"]');
  
  if (datetimeInput && serviceSelect) {
    datetimeInput.addEventListener('change', () => {
      clearTimeout(availabilityTimeout);
      availabilityTimeout = setTimeout(checkAvailability, 500);
    });
    
    serviceSelect.addEventListener('change', () => {
      clearTimeout(availabilityTimeout);
      availabilityTimeout = setTimeout(checkAvailability, 500);
    });
  }
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const submitBtn = form.querySelector('button[type="submit"]');
  
  if (submitBtn) {
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;
  }

  try {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (json.success) {
      alert(`Booking confirmed! ID: ${json.id}\n${json.message}\nEstimated duration: ${json.estimatedDuration}`);
      form.reset();
      document.getElementById('availabilityStatus').innerHTML = '';
    } else {
      let message = json.message || "Booking failed. Try again.";
      if (json.suggestedTimes && json.suggestedTimes.length > 0) {
        message += "\n\nSuggested available times:\n";
        json.suggestedTimes.forEach((time, index) => {
          const date = new Date(time);
          message += `${index + 1}. ${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\n`;
        });
      }
      alert(message);
    }
  } catch (err) {
    alert("There was an error submitting your booking.");
    console.error(err);
  } finally {
    if (submitBtn) {
      submitBtn.textContent = 'Submit Booking';
      submitBtn.disabled = false;
    }
  }
});

// ------------------------------
// Quick Book Service Button
// ------------------------------
function bookService(service) {
  const serviceSelect = form?.querySelector('select[name="service"]');
  if (serviceSelect) {
    serviceSelect.value = service;
    form.scrollIntoView({ behavior: "smooth" });
  }
}

// ------------------------------
// Before / After Slider
// ------------------------------
const slider = document.getElementById("baSlider");
const beforeWrap = document.getElementById("baBeforeWrap");

if (slider && beforeWrap) {
  slider.addEventListener("input", (e) => {
    const val = e.target.value;
    beforeWrap.style.width = val + "%";
  });
}

// ------------------------------
// FAQ Toggle
// ------------------------------
const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach((item) => {
  const btn = item.querySelector(".faq-question");

  btn?.addEventListener("click", () => {
    item.classList.toggle("open");
  });
});

// ------------------------------
// Floating CTA Show/Hide on Scroll
// ------------------------------
function handleFloatingCTA() {
  const floatingCTA = document.querySelector('.floating-cta');
  const heroSection = document.querySelector('#hero');
  
  if (!floatingCTA || !heroSection) return;
  
  const heroHeight = heroSection.offsetHeight;
  const scrollY = window.scrollY;
  
  // Show floating CTA when scrolled past 80% of hero section
  if (scrollY > heroHeight * 0.8) {
    floatingCTA.classList.add('show');
  } else {
    floatingCTA.classList.remove('show');
  }
}

// Initialize floating CTA on page load
document.addEventListener('DOMContentLoaded', () => {
  handleFloatingCTA();
});

// Handle floating CTA on scroll
window.addEventListener('scroll', () => {
  requestAnimationFrame(() => {
    handleFloatingCTA();
    handleNavbarScroll();
  });
});

// ------------------------------
// Mobile Navbar Scroll Effect
// ------------------------------
function handleNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  
  if (!navbar) return;
  
  // Add scrolled class when scrolled down more than 50px
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}
