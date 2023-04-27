export NODE_ENV=dev

npm install

rimraf dist

tsc -p ./tsconfig.build.json --pretty

cp package.json dist/