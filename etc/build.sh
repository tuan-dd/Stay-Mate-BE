export NODE_ENV=production

rimraf dist

tsc -p ./tsconfig.build.json --pretty

cp package.json dist/