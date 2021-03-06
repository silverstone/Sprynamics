import { Component, Inject, OnInit } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material'

@Component({
  selector: 'app-admin-designer-progress-dialog',
  templateUrl: './admin-designer-progress.dialog.html',
  styleUrls: ['./admin-designer-progress.dialog.scss']
})
export class AdminDesignerProgressDialog implements OnInit {
  constructor(
    @Inject(MAT_DIALOG_DATA) private data,
    private dialogRef: MatDialogRef<AdminDesignerProgressDialog>
  ) {}

  ngOnInit() {}
}
