document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.getElementById("navToggle");
  const navbar = document.getElementById("navbar");
  if (navToggle && navbar) {
    navToggle.addEventListener("click", () => {
      navToggle.classList.toggle("active");
      navbar.classList.toggle("open");
    });
  }
});
