dar_version := $(shell grep "^version" stripe/daml.yaml | sed 's/version: //g')

build:
	cd stripe && daml build
	cd stripe && make
	cd stripe && daml codegen js -o ../daml.js .daml/dist/stripe-$(dar_version).dar
	cd ui && yarn install --force --frozen-lockfile
	cd ui && yarn build

deploy: build
	mkdir -p deploy 
	cp stripe/.daml/dist/stripe-$(dar_version).dar deploy
	cd ui && zip -r ../deploy/stripe-ui.zip build
	cp stripe/dabl-integration-stripe-0.2.0.dit deploy

clean: 
	rm -rf deploy 
	rm -rf daml.js 
	rm -rf stripe/.daml 
	rm -rf *.dit
