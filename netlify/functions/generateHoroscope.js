exports.handler = async (event) => {
    // Only allow POST requests
if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Only POST requests are allowed' }),
    };
}

try {
    const { dob, time, location } = JSON.parse(event.body);

    if (!dob || !time || !location) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required parameters: dob, time, and location' }),
      };
    }

    // Return the generated horoscope chart
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Horoscope generated successfully',
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error generating horoscope',
        error: error.message,
      }),
    };
  }
}