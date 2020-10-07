#!/bin/sh
daml script --participant-config master-data/participants.json --json-api --dar .daml/dist/bootstrap-0.0.1.dar --script-name Main:loadTestData --input-file master-data/ledger-parties.json