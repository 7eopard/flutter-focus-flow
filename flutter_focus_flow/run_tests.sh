#!/bin/bash
# run_tests.sh - Script to run all tests for Flutter Focus Flow

echo "Starting Flutter Focus Flow Test Suite..."

# Run unit tests
echo "Running unit tests..."
flutter test

# Check if unit tests passed
if [ $? -eq 0 ]; then
    echo "✓ Unit tests passed"
else
    echo "✗ Unit tests failed"
    exit 1
fi

echo "All tests completed successfully!"