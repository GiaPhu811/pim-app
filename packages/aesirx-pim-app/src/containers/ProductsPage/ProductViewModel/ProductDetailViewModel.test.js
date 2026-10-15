/* eslint-env jest */
import { notify } from 'aesirx-uikit';
import ProductDetailViewModel from './ProductDetailViewModel';
import PAGE_STATUS from '../../../constants/PageStatus';

jest.mock('aesirx-uikit', () => ({ notify: jest.fn() }));
jest.mock('aesirx-lib', () => ({ PIM_PRODUCT_DETAIL_FIELD_KEY: { ID: 'id' } }));

afterEach(() => jest.clearAllMocks());

test.each([
  [
    {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Read-only access: Viewer or unresolved organization role cannot modify data',
      },
    },
    'Read-only access: Viewer or unresolved organization role cannot modify data',
  ],
  [{ _messages: [{ message: 'Legacy API error' }] }, 'Legacy API error'],
  [{ message: 'Request failed' }, 'Request failed'],
  [undefined, 'Something went wrong. Please try again.'],
  [{ _messages: [] }, 'Something went wrong. Please try again.'],
])('displays an error notification for payload %p', (payload, message) => {
  const viewModel = new ProductDetailViewModel({});
  viewModel.formStatus = PAGE_STATUS.LOADING;

  viewModel.onErrorHandler(payload);

  expect(notify).toHaveBeenCalledTimes(1);
  expect(notify).toHaveBeenCalledWith(message, 'error');
  expect(viewModel.formStatus).toBe(PAGE_STATUS.READY);
  expect(viewModel.successResponse.state).toBe(false);
});

test('displays the forbidden API message when updating a product fails', async () => {
  const message = 'Read-only access: Viewer or unresolved organization role cannot modify data';
  const result = {
    error: true,
    response: { success: false, error: { code: 'FORBIDDEN', message } },
  };
  const store = { update: jest.fn().mockResolvedValue(result) };
  const viewModel = new ProductDetailViewModel(store);
  viewModel.setForm({ formPropsData: { id: 59 } });

  expect(await viewModel.update()).toEqual(result);

  expect(store.update).toHaveBeenCalledWith({ id: 59 });
  expect(notify).toHaveBeenCalledWith(message, 'error');
  expect(viewModel.formStatus).toBe(PAGE_STATUS.READY);
});
