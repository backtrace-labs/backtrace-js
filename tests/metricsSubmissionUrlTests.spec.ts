import { getEndpointParams } from '../source/utils';

describe('Test Submission URL information in metrics support', () => {
  describe('Test universe name', () => {
    it('Test submit.backtrace.io universe name', () => {
      const expectedUniverseName = 'yolo';
      const expectedToken =
        '55555111112345eb7ae344f6e002de2e20c81fbdedf6991c2f3bb45b32b55555';
      const testSubmissionUrl = `https://submit.backtrace.io/${expectedUniverseName}/${expectedToken}/json`;

      const params = getEndpointParams(testSubmissionUrl);
      if (!params) {
        throw new Error(
          `Invalid test case - the test submission URL ${testSubmissionUrl} is invalid for current test`,
        );
      }

      expect(params.universe).toBe(expectedUniverseName);
      expect(params.token).toBe(expectedToken);
    });
  });

  it('Test invalid submit.backtrace.io universe name', () => {
    const expectedUniverseName = 'yolo';
    const expectedToken =
      '55555111112345eb7ae344f6e002de2e20c81fbdedf6991c2f3bb45b32b55555';
    const testSubmissionUrl = `https://submit.backtrace.io/${expectedUniverseName}/definitely-not-a-valid-url/${expectedToken}/json`;

    const params = getEndpointParams(testSubmissionUrl);

    expect(params).toBeUndefined();
  });

  it('Test invalid submit.backtrace.io without token', () => {
    const expectedUniverseName = 'yolo';
    const testSubmissionUrl = `https://submit.backtrace.io/${expectedUniverseName}`;

    const params = getEndpointParams(testSubmissionUrl);

    expect(params).toBeUndefined();
  });
});
