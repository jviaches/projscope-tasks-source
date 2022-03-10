import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Project } from '../core/models/project.model'

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  public project: Project;
  constructor(private router: Router) { }

  ngOnInit(): void {
  }
}
