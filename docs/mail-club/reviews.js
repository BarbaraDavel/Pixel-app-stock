const reviewDialog = document.getElementById('reviewsDialog');
const reviewOpen = document.getElementById('openReviews');
const reviewClose = document.getElementById('closeReviews');
reviewOpen?.addEventListener('click', () => reviewDialog?.showModal());
reviewClose?.addEventListener('click', () => reviewDialog?.close());
reviewDialog?.addEventListener('click', (event) => { if (event.target === reviewDialog) reviewDialog.close(); });
