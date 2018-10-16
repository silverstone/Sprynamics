import { CheckoutComponent } from '#app/checkout/checkout.component'
import { FabricCanvasComponent } from '#app/designer/fabric-canvas.component'
import { DesignerViewComponent } from '#app/designer/view/designer-view.component'
import { SidebarTabComponent } from '#app/designer/view/sidebar-tab.component'
import { SharedModule } from '#app/shared/shared.module'
import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { AdminDesignerProgressDialog } from './admin/admin-designer-progress-dialog/admin-designer-progress.dialog'
import { AlignmentService } from './admin/alignment.service'
import { DesignerAdminComponent } from './admin/designer-admin.component'
import { DesignerClientComponent } from './client/designer-client.component'
import { ImageSelectDialog } from './image-select-dialog/image-select.dialog'
import { ObjectFactoryService } from './object-factory.service'
import { AgentsComponent } from './sidebar/agents/agents.component'
import { DesignsComponent } from './sidebar/designs/designs.component'
import { ProductsComponent } from './sidebar/products/products.component'
import { PropertyComponent } from './sidebar/property/property.component'
import { TextComponent } from './sidebar/text/text.component'

const routes: Routes = [
  {
    path: '',
    component: DesignerClientComponent,
    children: [
      {
        path: 'checkout',
        loadChildren: '../checkout/checkout.module#CheckoutModule'
      }
    ]
  },
  { path: 'admin', component: DesignerAdminComponent }
]

@NgModule({
  imports: [RouterModule.forChild(routes), SharedModule],
  declarations: [
    DesignerAdminComponent,
    AgentsComponent,
    DesignsComponent,
    PropertyComponent,
    TextComponent,
    ImageSelectDialog,
    AdminDesignerProgressDialog,
    DesignerClientComponent,
    ProductsComponent,
    DesignerViewComponent,
    FabricCanvasComponent,
    SidebarTabComponent
  ],
  entryComponents: [ImageSelectDialog, AdminDesignerProgressDialog],
  providers: [AlignmentService, ObjectFactoryService]
})
export class DesignerModule {}
