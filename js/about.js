const contactForm = document.getElementById("contactForm");
const contactSuccess = document.getElementById("contactSuccess");

if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    contactForm.classList.add("hidden");
    contactSuccess.classList.remove("hidden");
  });
}
