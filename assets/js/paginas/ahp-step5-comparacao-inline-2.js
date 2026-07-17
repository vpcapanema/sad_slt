function toggleSaatyScale() {
      var toggle = document.getElementById('saaty-scale-toggle');
      var extras = document.querySelectorAll('.saaty-scale-extra');
      var chevron = document.getElementById('saaty-scale-chevron').querySelector('i');
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      // alternar
      toggle.setAttribute('aria-expanded', !expanded);
      extras.forEach(function(el) { el.classList.toggle('is-hidden', expanded); });
      chevron.className = expanded ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
    }
    // acessibilidade: Enter/Space ativam o toggle
    document.addEventListener('DOMContentLoaded', function() {
      var toggle = document.getElementById('saaty-scale-toggle');
      if (toggle) toggle.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSaatyScale(); }
      });
    });
