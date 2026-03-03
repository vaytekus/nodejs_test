const deleteProduct = (button) => {
  const cardActions = button.closest('.card__actions');
  if (!cardActions) return;
  const csrfInput = cardActions.querySelector('input[name="_csrf"]');
  const productIdInput = cardActions.querySelector('input[name="productId"]');
  const productId = productIdInput ? productIdInput.value : null;
  const csrfToken = csrfInput ? csrfInput.value : '';
  if (!productId) return;

  const productElement = button.closest('article');
  fetch(`/admin/product/${productId}`, {
    method: 'DELETE',
    headers: {
      'x-csrf-token': csrfToken,
      'Content-Type': 'application/json'
    }
  })
    .then(res => res.json())
    .then(() => {
      if (productElement) productElement.remove();
    })
    .catch(err => console.error(err));
};