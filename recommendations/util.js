function getRandomItems(arr, n) {
  if (arr.length < n) {
    return arr;
  }

  const randomIndices = new Set();
  while (randomIndices.size != n) {
    randomIndices.add(getRandomNumber(arr.length));
  }

  return Array.from(randomIndices).map((idx) => arr[idx]);
}

function getRandomNumber(n) {
  return Math.floor(Math.random() * n);
}

module.exports = { getRandomItems };
