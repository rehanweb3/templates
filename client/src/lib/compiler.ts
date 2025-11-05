export async function compileContract(source: string, contractName: string) {
  const response = await fetch('/api/compile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source, contractName }),
  });

  if (!response.ok) {
    let errorMessage = 'Compilation failed';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      errorMessage = `Server error: ${response.status} ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  try {
    return await response.json();
  } catch {
    throw new Error('Invalid response from server');
  }
}
