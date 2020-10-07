#!/bin/sh
daml script --participant-config participants.json --json-api --dar .daml/dist/bootstrap-0.0.1.dar --script-name Main:loadTestData --input-file prod-data/ledger-parties.json