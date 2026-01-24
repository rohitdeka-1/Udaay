#!/bin/bash

# This script creates a .env file with Firebase credentials on the VM
# The private key will have literal \n which the code will convert to real newlines

cat > ~/.env.firebase << 'EOF'
FIREBASE_PROJECT_ID=lakecity-cb44b
FIREBASE_PRIVATE_KEY_ID=e6c47d671a5d7d6dfb31ebb1eaaf33cbb63f015d
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDA/qmcByUiYNYp\nayTOA63pSb9D9/rDy/CBfao0AAh2uMfVuUfP6KrFXLjCNEpOqUSnfzX0vFeIxKxb\nfoxfYsjjnnFZaFrsvZ0GIesRQ3Q3XqQRAzk3wk3LCEKX9Cpou1QmdOJ9Vue3WwwM\ny2ZFo3AUfGFKlqxx36xOfhOXwnKnhrmqbsOZIcnuDqMhYu0TRthV7iYvP3pEByQn\n6Gkvf+tFnPhEj88d2di7Qs0XrhrLzyE5NBzfWnVJS/QhV5RJuEG3XLGjEHZ7iWeD\nUCIa0sxOqK4ccYer0vT5EEGwX+X9W5wnnuy6C9jtCoBzLZhHDHgCRdnpYY6mdd7Z\nhu6DnDw1AgMBAAECggEAAr784dP2Ms2G7pLwNKA3xsR+XLS4FDYgJ2+GzvObKzlI\n2qEmxO4OE/3UQSsmTYU6DVoRhfhyFGeb/jdIPwk0S4zTFw8VkB3IkLBF3HqFuk31\n7qoJk+IHYlatP+VA/zl/IobyPA9S/7hjbQEt5NrE+v2kEsAfFwW0OW+wzq19HSYW\nuTvJu0bwCVPuzbPOldu5cWREJMPGNEI00hYpTFx/3WiG6Ot2ukUy6BL9b0XLORbr\ngjUof/FLZBXEOlGnEMLlZ4pPTXWD83jujauGygr5L17zwNVhyoHSRf8fhK9DkPz3\n83Q5K6Ys+Z9J3Qb593bh9mjBFcglqiHByGGaVQ/3VwKBgQD73fwiMMa9YSXKZ0Q6\nNkYEParw8BPgKg9R6PWY2FCwFIq4OqefCXDeAbUlv0Ka2iL9iZZ34PWzhAopOHch\naWgsRBKL1JdhAyImqcpceTTB7I0WUjgTfW6dgznFdqOsVc6HTndaEqEYmjqkX7A7\nLGyU/wdtyhY4CAhAmSZxjdvPBwKBgQDEKV+PaHJMTlMw85qSAvDSsLT9yHVScJtr\nfa8JTKurOb+qkj8JTn5YIKsGrDnyut1A43TR2hMhM/yph9zpXCMD5djyZT2JDRgL\nScihphMz4VCuORkGZjpmD3dbMoUc5ZXiFNEy4LLrNK2vPayVrHEZbUpdsxC9oOum\nuVbSKAvP4wKBgF256c2/YPWwZSPA8f7Hm56QZEBs1rigbjsI+fv642vi+Qw9p4rj\nNIEpGYQGfH6rlkHLJZdOu6AmDrHwNUTVuNJgMpaecgbD572Dia6H3D4eDRK1XfDC\nyJsM7j6xO48yDz0C0h9Ot2w0WIY6pZYfnfiEPvt4LHSFaKzBUTEInTeZAoGAG3rk\nTTXHlVL/qoLl64CH9iwVHtxfOy5VR4iy5a2c+v67EA0u0YHyhywEaYnlEFEHP9jd\ne6x+M4+R3LoQw4xJx3kCnGp8ZV+1N5ediK+4TvNIly+ehtv5YGTYRqlcJoEvLx3V\ndLgvuG2Hy13reIhQy8wYt+mm9bm+aXvbYtODXBsCgYEAlXyePWJjMcQXeU5E87ea\nFuU7zRkYa8iMfCE93+EgVSRZABG+rrVJ/wWuPtiHCE5OaZsxEKbhvxJL7b0i0pjD\ntAhnp8nGNvSVQQzPvSZjSH8pS2CXIzX5xNDLhZDdED60tBit6WXFWW2hNF3FoCFa\nz7UXETHqUZqfO0W2TJwTgf0=\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@lakecity-cb44b.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=113321684144680109739
FIREBASE_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40lakecity-cb44b.iam.gserviceaccount.com
EOF

echo "Created .env.firebase file"
echo "Now appending to ~/lakecity/.env..."

# Append to the main .env file
cat ~/.env.firebase >> ~/lakecity/.env
rm ~/.env.firebase

echo "Firebase credentials added to ~/lakecity/.env"
echo "Restarting server..."

cd ~/lakecity
docker-compose restart server

sleep 5
echo "Checking Firebase initialization..."
docker-compose logs server | grep -i firebase | tail -10
