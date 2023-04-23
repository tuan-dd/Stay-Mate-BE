
rimraf dist

tsc -p ./tsconfig.build.json --pretty

cp package.json dist/