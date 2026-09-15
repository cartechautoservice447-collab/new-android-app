(() => {
  const MAX_DESCRIPTION = 200;
  let enhancedModal = null;
  let modalObserver = null;

  function enhanceCourseCreator() {
    const modal = document.querySelector('.course-create-modal');
    if (!modal || modal === enhancedModal) return Boolean(modal);

    enhancedModal = modal;
    modalObserver?.disconnect();
    modalObserver = null;

    const backdrop = modal.closest('.modal-backdrop');
    if (backdrop) backdrop.classList.add('course-create-backdrop');
    modal.classList.add('course-create-reference-active');

    const symbol = modal.querySelector('.modal-symbol');
    if (symbol) symbol.remove();

    const title = modal.querySelector('h2');
    if (title) title.textContent = 'Add New Course';

    const intro = modal.querySelector(':scope > p');
    if (intro) intro.textContent = 'Create a new course and start organizing your notes';

    const nameInput = modal.querySelector('.course-create-form input');
    if (nameInput) {
      nameInput.placeholder = 'e.g. Computer Science';
      nameInput.autocomplete = 'off';
      nameInput.classList.add('reference-course-name');
    }

    const labels = modal.querySelectorAll('.course-create-form > label');
    const descriptionLabel = Array.from(labels).find((label) => label.querySelector('textarea'));
    const descriptionInput = descriptionLabel?.querySelector('textarea');
    if (descriptionLabel && descriptionInput) {
      descriptionLabel.classList.add('course-description-field');
      descriptionInput.placeholder = 'Brief description of your course...';
      descriptionInput.maxLength = MAX_DESCRIPTION;
      descriptionInput.classList.add('reference-course-description');

      let counter = descriptionLabel.querySelector('.description-count');
      if (!counter) {
        counter = document.createElement('span');
        counter.className = 'description-count';
        descriptionLabel.appendChild(counter);
      }
      const updateCounter = () => {
        counter.textContent = `${descriptionInput.value.length}/${MAX_DESCRIPTION}`;
      };
      if (!descriptionInput.dataset.referenceCounterBound) {
        descriptionInput.addEventListener('input', updateCounter, { passive: true });
        descriptionInput.dataset.referenceCounterBound = 'true';
      }
      updateCounter();
    }

    // Keep the React-owned Accent Color selector intact. It controls the course color state.
    const accentRow = modal.querySelector('.course-form-row');
    if (accentRow) accentRow.classList.add('course-form-row-reference');

    const cancel = modal.querySelector('.secondary-button');
    if (cancel) cancel.remove();

    const submit = modal.querySelector('.course-form-actions .primary-button');
    if (submit) {
      submit.classList.add('create-course-submit');
      submit.textContent = 'Create Course →';
      submit.setAttribute('aria-label', 'Create course');
    }

    const form = modal.querySelector('.course-create-form');
    if (form && !form.dataset.referenceSubmitBound) {
      form.dataset.referenceSubmitBound = 'true';
      form.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          modal.querySelector('.modal-close')?.click();
        }
      });
    }

    if (!modal.dataset.referenceFocusHandled) {
      modal.dataset.referenceFocusHandled = 'true';
      requestAnimationFrame(() => nameInput?.focus());
    }

    return true;
  }

  function watchForModal() {
    if (enhanceCourseCreator()) return;
    modalObserver?.disconnect();
    modalObserver = new MutationObserver(() => {
      if (enhanceCourseCreator()) modalObserver?.disconnect();
    });
    modalObserver.observe(document.body, { childList: true, subtree: true });
    requestAnimationFrame(() => requestAnimationFrame(() => enhanceCourseCreator()));
  }

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button) return;
    const text = button.textContent?.replace(/\s+/g, ' ').trim().toLowerCase();
    if (text === 'add new course' || text.includes('add new course')) watchForModal();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      enhancedModal = null;
      modalObserver?.disconnect();
      modalObserver = null;
    }
  }, true);

  watchForModal();
})();
