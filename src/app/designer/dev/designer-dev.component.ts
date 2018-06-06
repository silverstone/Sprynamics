import { Component, OnInit, ViewChild, HostListener, AfterViewInit } from '@angular/core'
import { User } from '#models/user.model'
import { DesignState } from '#models/design-state.model'
import { AuthService } from '#core/auth.service'

import { first } from 'rxjs/operators'
import { CheckoutService } from '#app/checkout/checkout.service'
import { FirestoreService } from '#core/firestore.service'
import { FabricCanvasComponent } from '#app/designer/fabric-canvas.component'
import { Design } from '#app/models/design.model'
import { WebfontService } from '#core/webfont.service'
import { DEFAULT_BRAND_COLORS } from '#models/brand-colors.model'
import { promiseImage } from '#app/helpers/promise-image'
import { Product, newProductSizes, productSpecs, newThumbnailSizes } from '#app/models/product.model'
import { DesignerViewComponent } from '#app/designer/view/designer-view.component'
import { SidebarTabComponent } from '#app/designer/view/sidebar-tab.component'

import 'fabric'
import { imageToDataUri } from '#app/helpers/img-to-data-uri'
declare let fabric

import * as JSZip from 'jszip'

import * as jspdf from 'jspdf'
import { StorageService } from '#core/storage.service'
import { Router } from '@angular/router'
import { StateService } from '#core/state.service'
declare let jsPDF

@Component({
  selector: 'app-designer-dev',
  templateUrl: './designer-dev.component.html',
  styleUrls: ['./designer-dev.component.scss']
})
export class DesignerDevComponent implements AfterViewInit {
  @ViewChild(DesignerViewComponent) designerView: DesignerViewComponent
  @ViewChild(FabricCanvasComponent) fabricCanvas: FabricCanvasComponent
  @ViewChild('designsTab') designsTab: SidebarTabComponent

  designState: DesignState = {}
  agents: User[]
  user: User
  selectedAgent: User

  loading = true
  processing = false
  viewSide: 'front' | 'back' = 'front'

  selectedListing: any
  selectedProduct: Product
  listingId: string

  constructor(
    private auth: AuthService,
    private checkout: CheckoutService,
    private firestore: FirestoreService,
    private storage: StorageService,
    private webfont: WebfontService,
    private router: Router,
    private state: StateService
  ) {}

  async ngAfterViewInit() {
    try {
      /* load user */
      const user = await this.auth.user.pipe(first()).toPromise()
      console.log(user)
      this.user = user
      /* load agents */
      const managedAgents = await this.firestore.promiseColWithIds<User>('users', ref => ref.where(`managers.${user.uid}`, '==', true))
      const createdAgents = await this.firestore.promiseColWithIds<User>(`users/${user.uid}/agents`)
      this.agents = managedAgents.concat(createdAgents)
      this.selectedAgent = user
      /* set up design state */
      const designState = this.state.designState || this.state.loadFromStorage()
      if (designState) {
        console.log(designState)
        this.designState = designState
        /* set product */
        this.selectedProduct = designState.product
        /* load fonts */
        let fonts = designState.design.fonts
        if (!fonts || fonts.length === 0) {
          fonts = ['Roboto']
        }
        await this.webfont.load(fonts)
        /* load canvas data */
        await this.fabricCanvas.loadFromJSON(this.designState.canvasData.front)
        await this.processCanvas()
      } else {
        this.designState.agent = user
        this.designState.brandColors = user.brandColors || DEFAULT_BRAND_COLORS
      }
      /* initialize order */
      await this.checkout.initOrder()
      /* completed loading */
      this.loading = false
    } catch (err) {
      window.alert(err.message)
      console.error(err)
    }
  }

  async loadDesign(design: Design) {
    this.processing = true
    this.designState.design = design
    try {
      /* load fonts */
      if (!design.fonts || design.fonts.length === 0) {
        design.fonts = ['Roboto']
      }
      await this.webfont.load(design.fonts)
      /* fetch json data from url */
      this.designState.canvasData = await (await fetch(design.url)).json()
      /* load canvas from json */
      await this.fabricCanvas.loadFromJSON(this.designState.canvasData.front)
      this.viewSide = 'front'
      /* process canvas */
      await this.processCanvas()
    } catch (err) {
      window.alert(err.message)
      console.error(err)
    }
    this.processing = false
  }

  async processCanvas() {
    this.processing = true
    try {
      /* resize to fit screen */
      this.fabricCanvas.zoomToFit()
      /* clear previous fields */
      this.designState.textFields = []
      this.designState.agentFields = []
      /* find objects */
      this.designState.backgroundObj = this.fabricCanvas.findObjects(obj => obj.isBackground, true)[0]
      this.designState.boundBoxObj = this.fabricCanvas.findObjects(obj => obj.isBoundBox, true)[0]
      this.designState.addressObj = this.fabricCanvas.findObjects(obj => obj.textContentType === 'address')[0]
      console.log(this.designState.addressObj)
      /* map text fields */
      const fieldFromObject = obj => ({ obj, name: obj.textFieldName || obj.textUserData })
      this.designState.textFields = this.fabricCanvas.findObjects(obj => obj.userEditable).map(fieldFromObject)
      this.designState.agentFields = this.fabricCanvas.findObjects(obj => obj.textContentType === 'data').map(fieldFromObject)
      this.designState.propertyFields = this.fabricCanvas.findObjects(obj => obj.textContentType === 'property').map(fieldFromObject)
      /* find property images */
      this.designState.propertyImages = this.fabricCanvas.findObjects(obj => obj.isUserImage)
      /* clip canvas to bound box */
      this.fabricCanvas.canvas.clipTo = ctx => {
        const c = this.designState.boundBoxObj.getCoords()
        const x = c[0].x
        const y = c[0].y
        const canvasCenter = this.fabricCanvas.canvas.getCenter()
        const zoom = this.fabricCanvas.canvas.getZoom()
        const bound = this.designState.boundBoxObj.getBoundingRect(false)
        ctx.rect(bound.left, bound.top, bound.width, bound.height)
      }
      /* loop through canvas objects */
      for (let obj of this.fabricCanvas.getObjects()) {
        /* set object properties */
        obj.set({
          selectable: false,
          editable: false,
          hasControls: false,
          lockMovementX: true,
          lockMovementY: true,
          objectCaching: false
        })
        /* hide hidden objects (dotted lines) */
        if (obj.isHidden) {
          obj.visible = false
        }
        /* set brand colors */
        if (obj.brandColorRole && obj.brandColorRole !== 'none') {
          const color = this.designState.brandColors[obj.brandColorRole]
          obj.set({ fill: color })
        }
        /* set pointer cursor for user images */
        obj.hoverCursor = obj.isUserImage ? 'pointer' : 'default'
        /* inject user images */
        if (obj.isLogo) {
          let src
          switch (obj.logoType) {
            case 'headshot':
              src = this.selectedAgent.avatarUrl
              break
            case 'brokerage':
              src = this.selectedAgent.brokerageLogoUrl
              break
            case 'company':
              src = this.selectedAgent.companyLogoUrl
              break
            default:
              src = '/assets/logo.png'
          }
          const img = await promiseImage(src)
          const width = obj.width * obj.scaleX
          const height = obj.height * obj.scaleY
          obj.setElement(img)
          obj.scaleX = width / img.width
          obj.scaleY = height / img.height
        }
      }
      /* inject agent data into text */
      this.updateAgentFields()
      // this.fabricCanvas.zoomToFit(this.designState.boundBoxObj)
      this.fabricCanvas.canvas.renderAll()
      this.state.setDesignState(this.designState)
    } catch (err) {
      if (err.message) {
        window.alert(err.message)
      }
      console.error(err)
    }
    this.processing = false
  }

  async setViewSide(viewSide: 'front' | 'back') {
    try {
      this.viewSide = viewSide
      this.processing = true
      await this.fabricCanvas.loadFromJSON(this.designState.canvasData[viewSide])
      await this.processCanvas()
      this.processing = false
    } catch (err) {
      window.alert(err.message)
      console.error(err)
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    this.fabricCanvas.zoomToFit(this.designState.boundBoxObj)
  }

  changeProduct(product: Product) {
    if (
      !this.selectedProduct ||
      !this.designState.canvasData ||
      confirm('Are you sure you wish to change products? You will lose your current design.')
    ) {
      const isFirstTime = !this.selectedProduct
      this.selectedProduct = product
      this.designState.product = product
      this.state.setDesignState(this.designState)
      if (isFirstTime) {
        this.designerView.clickTab(this.designsTab, true)
      } else {
        this.designState.canvasData = null
      }
    }
  }

  changeAgent(agent: User) {
    this.selectedAgent = agent
    this.checkout.setUser(agent)
    this.updateAgentFields()
  }

  changeProperty(property: any) {
    console.log(this.designState.addressObj)
    this.selectedListing = property.listing
    if (this.designState.addressObj) {
      this.designState.addressObj.text = property.formatted_address
      this.fabricCanvas.render()
    }
  }

  updateAgentFields() {
    this.designState.agentFields.forEach(field => {
      if (field.obj.textUserData === 'name') {
        const firstName = this.selectedAgent.firstName || ''
        const lastName = this.selectedAgent.lastName || ''
        field.obj.text = firstName + (lastName ? ' ' + lastName : '')
      } else {
        field.obj.text = this.selectedAgent[field.obj.textUserData] || ''
      }
    })
    this.fabricCanvas.render()
  }

  async saveAndContinue() {
    this.processing = true
    this.designState.canvasData[this.viewSide] = await this.fabricCanvas.toJSON()
    const canvas = document.createElement('canvas')
    canvas.id = 'pdf_canvas'
    const product = newProductSizes[this.selectedProduct]
    canvas.width = (product.width + productSpecs.bleedInches * 2) * productSpecs.dpi
    canvas.height = (product.height + productSpecs.bleedInches * 2) * productSpecs.dpi
    document.body.appendChild(canvas)
    const pdfCanvas = new fabric.Canvas('pdf_canvas', {
      width: canvas.width,
      height: canvas.height,
      preserveObjectStacking: true
    })
    canvas.style.display = 'none'
    pdfCanvas.loadFromJSON(this.designState.canvasData.front, async () => {
      const boundBox = this.fabricCanvas.canvas.getObjects('rect').filter(obj => obj.isBoundBox)[0]
      pdfCanvas.clipTo = null
      // pdfCanvas.imageSmoothingEnabled = false;
      const offsetX = boundBox.left - productSpecs.bleedInches * productSpecs.dpi
      const offsetY = boundBox.top - productSpecs.bleedInches * productSpecs.dpi
      // console.log(offsetX, offsetY);
      pdfCanvas.forEachObject(obj => {
        obj.left -= offsetX
        obj.top -= offsetY
      })
      pdfCanvas.getObjects('rect').forEach(obj => {
        if (obj.strokeDashArray && obj.strokeDashArray[0] === 5 && obj.strokeDashArray[1] === 5) {
          pdfCanvas.remove(obj)
        }
      }) // remove the dashed lines
      const bg = new fabric.Rect({
        left: 0,
        top: 0,
        width: (product.width + productSpecs.bleedInches * 2) * productSpecs.dpi,
        height: (product.height + productSpecs.bleedInches * 2) * productSpecs.dpi,
        fill: '#ffffff'
      })
      pdfCanvas.add(bg)
      pdfCanvas.sendToBack(bg)
      pdfCanvas.renderAll()

      // const front = pdfCanvas.toDataURL();
      // this.loadingPdf = true;
      // this.loadingMessage = 'Processing front side...';
      const front = await this.fabricCanvas.getDataURL(this.designState.canvasData.front, pdfCanvas, product.width, product.height)
      // this.loadingMessage = 'Processing back side...'
      const back = await this.fabricCanvas.getDataURL(this.designState.canvasData.back, pdfCanvas, product.width, product.height)

      /* Generate Thumbnail */
      var img = await promiseImage(front)
      var newDataUri = imageToDataUri(
        img,
        newThumbnailSizes[this.selectedProduct].width * 4,
        newThumbnailSizes[this.selectedProduct].height * 4
      )
      this.checkout.thumbnail = newDataUri
      this.checkout.updateOrder({ thumbnail: newDataUri })

      // generate PDF
      // this.loadingMessage = 'Generating PDF...';
      const doc = new jspdf('l', 'in', [product.width + productSpecs.bleedInches * 2, product.height + productSpecs.bleedInches * 2])
      doc.addImage(front, 'PNG', 0, 0, product.width + productSpecs.bleedInches * 2, product.height + productSpecs.bleedInches * 2)
      doc.addPage()
      doc.addImage(back, 'PNG', 0, 0, product.width + productSpecs.bleedInches * 2, product.height + productSpecs.bleedInches * 2)
      const pdfDataUrl: string = doc.output('blob')

      // compress files
      // this.loadingMessage = 'Compressing files...'
      const zip = new JSZip()
      zip.file('front.png', front.replace(/data:image\/png;base64,/, ''), { base64: true })
      zip.file('back.png', back.replace(/data:image\/png;base64,/, ''), { base64: true })
      // zip.file('design.pdf', pdfDataUrl, { base64: true });
      const zipDataString = await zip.generateAsync({
        type: 'base64',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 1
        }
      })
      // upload the design
      // this.loadingMessage = 'Uploading finished design...'
      const zipDataUrl = 'data:application/zip;base64,' + zipDataString
      const task = this.storage.putBase64(zipDataUrl, 'design.zip', 'application/zip')
      // task.percentageChanges().subscribe(snap => {
      //   this.loadingProgress = snap
      // })
      const downloadUrl = await task
      console.log(downloadUrl)
      this.checkout.updateOrder({
        pdfUrl: downloadUrl
      })
      pdfCanvas.dispose()
      canvas.remove()
      this.router.navigate(['/checkout'])
    })
  }
}