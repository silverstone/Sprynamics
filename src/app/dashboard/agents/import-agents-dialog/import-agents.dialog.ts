import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { MailingListDialog } from '#app/shared/mailing-list-dialog/mailing-list.dialog';
import { PapaParseService } from 'ngx-papaparse';
import * as firebase from 'firebase';
import { FirestoreService } from '#core/firestore.service';
import { AuthService } from '#core/auth.service';

@Component({
  selector: 'app-import-agents-dialog',
  templateUrl: './import-agents.dialog.html',
  styleUrls: ['./import-agents.dialog.scss']
})
export class ImportAgentsDialog implements OnInit {

  isLoading: boolean;

  title: string;

  csvData: any[];
  columns = ['firstName', 'lastName', 'email', 'phoneNumber', 'company', 'website', 'address1', 'address2', 'city', 'state', 'zipCode', 'licenseId'];
  mappedColumns = []; // this will end up being an array of column numbers corresponding to the above names

  constructor(
    @Inject(MAT_DIALOG_DATA) private data: any,
    private dialogRef: MatDialogRef<MailingListDialog>,
    private papa: PapaParseService,
    private firestore: FirestoreService,
    private auth: AuthService
  ) { }

  ngOnInit() {
    this.isLoading = true;
    const reader = new FileReader();
    reader.onload = (event: any) => {
      this.papa.parse(event.target.result, {
        skipEmptyLines: true,
        complete: (results, file) => {
          this.csvData = results.data;
          const normalizeHeader = (header: string) => header.toLowerCase().replace(/ /g, '');
          results.data[0].forEach((header, hi) => {
            this.columns.forEach((column, ci) => {
              console.log(normalizeHeader(column) === normalizeHeader(header))
              if (normalizeHeader(column) === normalizeHeader(header)) {
                this.setColumn(ci, hi);
                console.log(this.mappedColumns)
                return;
              }
            })
          })
          this.isLoading = false;
        }
      })
    };
    reader.readAsText(this.data.file);
  }

  // maps a column to a mailing list value
  setColumn(index: number, val: string) {
    const col = parseInt(val);
    this.mappedColumns[index] = col;
  }

  saveList() {
    this.isLoading = true;

    const results = [];
    const rowCount = this.csvData.length;
    this.csvData.forEach((row, i) => {
      if (i === 0) return; // skip first row (column headers)
      const obj = {};
      this.columns.forEach((col, j) => {
        let item = row[this.mappedColumns[j]];
        if (item === undefined)
          item = '';
        obj[col] = item;
      });
      results.push(obj);
    });

    this.auth.user.take(1).subscribe(user => {
      const batch = firebase.firestore().batch();
      results.forEach(agentData => {
        const doc = this.firestore.col('users').ref.doc();
        const agent = {
          id: doc.id,
          uid: doc.id,
          isCreated: true,
          managerId: user.uid,
          managers: { [user.uid]: true }
        }
        Object.assign(agent, agentData);
        batch.set(doc, agent);
      });
      batch.commit()
        .then(success => {
          this.isLoading = false
          this.dialogRef.close();
        })
        .catch(err => {
          window.alert(err.message);
          console.log(err.message);
        });
    });
  }

}